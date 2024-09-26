const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 3000;
const stripe = require('stripe')("sk_test_51PLSF52NHkygt9EvLzJWyOstCdquzjbXWNHrh0hCJLRWvEQGtkOJNHlaSSu2AutCcs5lF0aeT5pz84ZRNvTXxHxX00pu62gD6j");


// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    "https://super-box-d647e.web.app",
  ],
  credentials: true
}));
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId, Transaction } = require('mongodb');
const uri = "mongodb+srv://SuperBox:jVbyiaDYl7zt6w2j@cluster0.3t1ep.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {


    const userCollection = client.db("SuperBox").collection("users")
    const webCollection = client.db("SuperBox").collection("websites")
    const productsCollection = client.db("SuperBox").collection("products")
    const customerCollection = client.db("SuperBox").collection("customers")
    const paymentCollection = client.db("SuperBox").collection("payments")
    const appliedSellerCollection = client.db("SuperBox").collection("appliedSellers")
    const blogCollection = client.db("SuperBox").collection("blogs")

    // User-related APIs===================================================================
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send("User created");
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Role definition API========================================================================
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send({ role: user.role || "user" });
    });

    // Seller-related APIs=======================================================================
    app.post("/appliedForSeller", async (req, res) => {
      const webData = req.body;
      const query = { email: webData.email };
      const checkValidation = await appliedSellerCollection.findOne(query);
      if (checkValidation) {
        return res.status(404).send({ message: "Already applied, please wait for approval" });
      }
      const result = await appliedSellerCollection.insertOne(webData);
      res.send(result);
    });

    app.get("/requests", async (req, res) => {
      const result = await appliedSellerCollection.find().toArray();
      res.send(result);
    });
    app.get("/requestorDetails/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await appliedSellerCollection.findOne(query);
      res.send(result);
    });
    app.post("/approveSeller/:id", async (req, res) => {
      const id = req.params.id;
      try {
        // Find the seller's information by ID
        const query = { _id: new ObjectId(id) };
        const sellerInfo = await appliedSellerCollection.findOne(query);

        if (!sellerInfo) {
          return res.status(404).send({ message: "Seller not found" });
        }

        const email = sellerInfo.email;

        // Update the user's role in the userCollection
        const updateQuery = { email: email };
        const update = {
          $set: {
            role: "seller",
          },
        };
        const updateUserRole = await userCollection.updateOne(updateQuery, update);

        if (updateUserRole.modifiedCount === 0) {
          return res.status(500).send({ message: "Failed to update user role" });
        }

        // Insert the seller's data into the webCollection
        const insertToWebCollection = await webCollection.insertOne(sellerInfo);
        if (!insertToWebCollection.insertedId) {
          return res.status(500).send({ message: "Failed to insert seller into webCollection" });
        }

        // Remove the seller from the appliedSellerCollection
        const deleteFromAppliedSeller = await appliedSellerCollection.deleteOne(query);
        if (deleteFromAppliedSeller.deletedCount === 0) {
          return res.status(500).send({ message: "Failed to remove seller from applied collection" });
        }

        res.send({ message: "Seller approved successfully" });
      } catch (error) {
        console.error("Error approving seller:", error);
        res.status(500).send({ message: "Server error" });
      }
    });
    app.delete("/deleteRequest/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await appliedSellerCollection.deleteOne(query);
      res.send(result)
    })


    app.post("/approve/:email", async (req, res) => {
      const email = req.params.email;

      res.send("Seller approved");
    });
    app.delete("/deleteSeller/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const webData = await webCollection.findOne(query)
      const findUser = await userCollection.findOne({ email: webData.email })
      const update = {
        $unset: {
          role: "",  // Empty string, doesn't matter what the value is
        },
      };
      const removeRole = await userCollection.updateOne({ email: webData.email }, update);
      const result = await webCollection.deleteOne(query)
      res.send(result)
    })

    app.get("/pendingSeller/:email", async (req, res) => {
      try {
        const findRequest = await appliedSellerCollection.findOne({ email: req.params.email });
        if (findRequest) {
          res.send(true);
        } else {
          res.send(false);
        }
      } catch (error) {
        console.error("Error fetching seller:", error);
        res.status(500).send({ error: "Server error" });
      }
    });


    // Website-related APIs-=================================================================================
    app.get("/webData/:email", async (req, res) => {
      const email = req.params.email;

      const result = await webCollection.findOne({ email });
      res.send(result);
    });
    app.put("/webData/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const updateData = req.body; // This can include banner, navbar, etc.

        if (!Object.keys(updateData).length) {
          return res.status(400).json({ message: "No data provided." });
        }

        // Construct the update query dynamically based on the data provided
        let updateFields = {};
        for (const key in updateData) {
          if (updateData.hasOwnProperty(key)) {
            updateFields[`webInfo.${key}`] = updateData[key];
          }
        }
        console.log(updateFields)
        const updatedShop = await webCollection.findOneAndUpdate(
          { email },
          {
            $set: updateFields
          },
          { new: true }
        );

        if (!updatedShop) {
          return res.status(404).json({ message: "Shop not found with the provided email." });
        }

        res.status(200).json({
          message: "Data updated successfully",
          updatedShop
        });

      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });



    app.get("/w/:name", async (req, res) => {
      const name = req.params.name;
      const result = await webCollection.findOne({ "webInfo.shopName": name });
      res.send(result);
    });

    app.get("/sellerData", async (req, res) => {
      const result = await webCollection.find().toArray();
      res.send(result);
    });

    // Products-related APIs========================================================================
    app.get("/sellerProducts/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email)
      const result = await productsCollection.find({ sellerEmail: email }).toArray();
      res.send(result);
    });

    app.get("/w/products/:name", async (req, res) => {
      const name = req.params.name;
      const result = await productsCollection.find({ shopName: name }).toArray();
      res.send(result);
    });

    app.post("/addProducts", async (req, res) => {
      const productData = req.body;

      // const result = await productsCollection.insertOne(requests);
      const findWebsite = await webCollection.findOne({ email: productData.sellerEmail })


      const finalData = { ...productData, shopName: findWebsite.webInfo.shopName }
      const result = await productsCollection.insertOne(finalData)

      res.send(result);
    });
    app.delete("/deleteProduct/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await productsCollection.deleteOne(query);
      res.send(result)
    })

    app.delete("/deleteProduct/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    // Customer-related APIs===================================================================
    app.post('/customer', async (req, res) => {
      const customer = req.body;
      const query = { email: customer?.email };
      const existingCustomer = await customerCollection.findOne(query);
      if (existingCustomer) {
        return res.send({ message: 'Customer already exists', insertedId: null });
      }
      const result = await customerCollection.insertOne(customer);
      res.send("Customer created");
    });

    app.get("/customers", async (req, res) => {
      const result = await customerCollection.find().toArray();
      res.send(result);
    });
    // blog-related api ======================================================================
    app.post("/addBlog", async (req, res) => {
      const requests = req.body;
      const result = await blogCollection.insertOne(requests);
      res.send(result);
    });
    app.delete("/deleteBlog/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await blogCollection.deleteOne(query);
      res.send(result)
    })


    // Payment-related APIs============================================================================
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

    app.get('/transaction', async (req, res) => {
      const paymentResult = await paymentCollection.find().toArray();
      res.send(paymentResult);
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Super box server in running')
})

app.listen(port, () => {
  console.log(`Super box is running on port ${port}`)
})