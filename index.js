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
app.use(express.urlencoded({ extended: true }));
const qs = require('qs')


const { MongoClient, ServerApiVersion, ObjectId, Transaction } = require('mongodb');
const { default: axios } = require('axios');
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
    const serviceCollection = client.db("SuperBox").collection("services")
    const pendingProductCollection = client.db("SuperBox").collection("pendingProducts")
    const productPaymentCollection = client.db("SuperBox").collection("productPayments")
    const feedbackCollection = client.db("SuperBox").collection("feedbacks")

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
      const result = await productsCollection.find({ sellerEmail: email }).toArray();
      res.send(result);
    });

    app.get("/w/products/:name", async (req, res) => {
      const name = req.params.name;
      const result = await productsCollection.find({ shopName: name }).toArray();
      res.send(result);
    });
    app.get("/w/pendingProduct/:sellerEmail/:buyerEmail", async (req, res) => {
      const { sellerEmail, buyerEmail } = req.params;
      const result = await productPaymentCollection.find({ isReceived: false, buyerEmail: buyerEmail, sellerEmail: sellerEmail }).toArray()
      res.send(result);
    });
    app.get("/w/purchasedProduct/:sellerEmail/:buyerEmail", async (req, res) => {
      const { sellerEmail, buyerEmail } = req.params;
      const result = await productPaymentCollection.find({ isReceived: true, buyerEmail: buyerEmail, sellerEmail: sellerEmail }).toArray()
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
    app.get("/purchaseProducts/:email", async (req, res) => {
      const { email } = req.params

      const result = await paymentCollection.find({ email: email }).toArray();
      res.send(result);
    });
    app.put("/product/:id", async (req, res) => {
      const id = req.params.id
      const updatedData = req.body
      const result = await productsCollection.updateOne({ _id: new ObjectId(id) },
        {
          $set: updatedData
        },);
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
    app.get("/customerInfo/:email", async (req, res) => {
      const { email } = req.params

      const result = await customerCollection.findOne({ email: email });
      res.send(result);
    });
    app.put('/customer/:email', async (req, res) => {
      const { email } = req.params;
      const updatedData = req.body;

      try {
        const result = await customerCollection.findOneAndUpdate(
          { email: email },
          { $set: updatedData },
          { returnOriginal: false }  // This ensures the updated document is returned
        );


        res.json({ message: 'Customer updated successfully', data: result.value });
      } catch (error) {  // You forgot to pass the 'error' object here
        res.status(500).json({ message: 'Error updating customer', error: error.message });
      }
    });



    // blog-related api ======================================================================
    app.post("/addBlog", async (req, res) => {
      const requests = req.body;
      const result = await blogCollection.insertOne(requests);
      res.send(result);
    });
    app.get("/blogs/:email", async (req, res) => {

      const result = await blogCollection.find({ email: req.params.email }).toArray()
      res.send(result)
    })
    app.delete("/deleteBlog/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await blogCollection.deleteOne(query);
      res.send(result)
    })

    // service-related APIs============================================================================
    app.post('/service', async (req, res) => {
      const serviceData = req.body
      const result = await serviceCollection.insertOne(serviceData)
      res.send(result)
    })
    app.get('/service/:name', async (req, res) => {
      const name = req.params.name
      const query = { shopName: name }
      const result = await serviceCollection.find(query).toArray()
      res.send(result)
    })
    app.delete('/service/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/serviceDetails/:id', async (req, res) => {
      const id = req.params.id

      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
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

    app.get('/payments/:email', async (req, res) => {
      const { email } = req.params;
      const pendingProduct = await productPaymentCollection.find({ sellerEmail: email }).toArray()
      res.send(pendingProduct);
    });

    app.post('/payment', async (req, res) => {
      const data = req.body;  // Get the product data from the request body

      try {
        if (Array.isArray(data)) {
          // If the data is an array, use insertMany to insert multiple products
          const result = await productPaymentCollection.insertMany(data);
          res.status(201).json({ message: 'Multiple products inserted', result });
        } else {
          // If it's a single product, use insertOne to insert just one
          const result = await productPaymentCollection.insertOne(data);
          res.status(201).json({ message: 'Single product inserted', result });
        }
      } catch (error) {
        console.error('Error inserting product(s):', error);
        res.status(500).json({ error: 'Failed to insert product(s)' });
      }
    });
    app.delete('/w/payment/:id', async (req, res) => {
      const { id } = req.params;  // Get the product data from the request body
      console.log(id)
      const result = await productPaymentCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    });
    const { ObjectId } = require('mongodb'); // Import ObjectId if not already imported

    // Update API for product payment
    app.patch('/payment/:id', async (req, res) => {
      const { id } = req.params;  // Extract the product ID from the request parameters
      const updateData = req.body;  // Get the update data from the request body

      try {
        // Ensure that we have valid data to update
        if (!updateData || Object.keys(updateData).length === 0) {
          return res.status(400).json({ message: 'No update data provided' });
        }

        // Update the product in the collection
        const result = await productPaymentCollection.updateOne(
          { _id: new ObjectId(id) },  // Filter by the product ID
          { $set: updateData }        // Use the $set operator to update the specified fields
        );

        // Send the response based on the result
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated successfully', result });
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: 'Failed to update product', error });
      }
    });

    app.post('/paymentSSL', async (req, res) => {
      const data = req.body;
      const trxId = new ObjectId().toString();

      // Prepare initial data for SSLCommerz
      const initialData = {
        store_id: "super670a204485dde",  // Your store ID
        store_passwd: "super670a204485dde@ssl",  // Your store password
        total_amount: data.Amount,
        currency: "BDT",
        tran_id: trxId,
        success_url: "http://localhost:3000/success-payment",
        fail_url: "http://localhost:3000/failed",
        cancel_url: "http://localhost:3000/cancel",
        cus_name: "John Doe",
        cus_email: "john@example.com",
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1212",
        cus_country: "Bangladesh",
        cus_phone: "01700000000",
        ship_name: "John Doe",
        ship_add1: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: "1212",
        ship_country: "Bangladesh",
        product_name: "Test Product",
        product_category: "Test",
        product_profile: "general",
        shipping_method: "NO",
        multi_card_name: "VISA,MASTER,AMEX",  // Updated for supporting card payments
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D"
      };

      try {
        // Update product details for each productId
        for (let id of data.productId) {
          const product = await productsCollection.findOne({ _id: new ObjectId(id) });
          const { _id, ...restOfProduct } = product
          const updateData = {
            ...restOfProduct,
            buyerEmail: data.buyerEmail,
            paymentMethod: data.paymentMethod,
            isReceived: false,
            paymentStatus: "pending", // Mark as pending payment
            transactionId: trxId // Add transaction ID
          };

          // Update the product in the database
          await productPaymentCollection.insertOne(updateData);
        }

        // After updating the product details, make the payment request to SSLCommerz
        const response = await axios.post(
          'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
          qs.stringify(initialData),  // Convert to x-www-form-urlencoded
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'  // Set correct headers
            }
          }
        );

        // Log the response from SSLCommerz and send the response back to the client
        res.json({
          message: "Payment success and product status updated",
          sslCommerzResponse: response.data,
          transactionId: trxId
        });

      } catch (error) {
        console.error("Error in SSLCommerz request or updating products:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Payment request failed" });
      }
    });



    app.post('/success-payment', async (req, res) => {
      const successData = req.body;


      try {
        // Find all products with the same transactionId
        const products = await productPaymentCollection.find({ transactionId: successData.tran_id }).toArray();

        if (products.length === 0) {
          return res.status(404).send('No products found for this transaction.');
        }

        // Loop through each product and update the payment status
        for (let product of products) {
          await productPaymentCollection.updateOne(
            { _id: product._id }, // Filter by product's unique _id
            { $set: { paymentStatus: "success" } } // Set the payment status to 'success'
          );
        }

        // Get the website name from any of the products (assuming all share the same webName)
        const wedName = products[0].shopName;

        // Redirect to the website page with the webName
        // res.redirect(`http://localhost:5173/w/${wedName}`);
        res.redirect(`https://super-box-d647e.web.app/w/${wedName}`);
      } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    app.post('/failed', async (req, res) => {
      const failedData = req.body;
      console.log(failedData);

      // Update the transaction status to 'failed' in the database
      await productPaymentCollection.updateOne(
        { tran_id: failedData.tran_id },
        { $set: { status: "failed", details: failedData } }
      );

      res.status(200).json({ message: "Payment failed", data: failedData });
    });

    app.post('/cancel', async (req, res) => {
      const cancelData = req.body;
      console.log(cancelData);

      // Update the transaction status to 'cancelled' in the database
      await productPaymentCollection.updateOne(
        { tran_id: cancelData.tran_id },
        { $set: { status: "cancelled", details: cancelData } }
      );

      res.status(200).json({ message: "Payment cancelled", data: cancelData });
    });



    app.get('/transaction', async (req, res) => {
      const paymentResult = await paymentCollection.find().toArray();
      res.send(paymentResult);
    });

    // cart related api =============================================================
    app.post('/cart/:id/:email', async (req, res) => {
      try {
        const { id, email } = req.params;
        let user = await customerCollection.findOne({ email: email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const itemExists = user.cart.includes(id);
        if (itemExists) {
          return res.status(400).json({ message: "Item already in cart", cart: user.cart });
        }

        const result = await customerCollection.updateOne(
          { email: email },
          { $push: { cart: id } }
        );


        if (result.modifiedCount === 1) {
          return res.status(200).json({ message: "Item added to cart", cart: [...user.cart, id] });
        } else {
          return res.status(500).json({ message: "Failed to update cart" });
        }
      } catch (error) {

        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    });


    app.get("/cart/:email/:shopName", async (req, res) => {
      try {
        const { email, shopName } = req.params;

        // Find the user by email
        const user = await customerCollection.findOne({ email: email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const cartItems = user.cart; // Array of product IDs from the cart

        if (!cartItems.length) {
          return res.status(200).json({ message: "Cart is empty", products: [] });
        }

        // Query the products collection for products in the cart that match the shopName
        const query = {
          _id: { $in: cartItems.map(id => new ObjectId(id)) }, // Match product IDs in the cart
          shopName: shopName // Match the specific shopName
        };

        const products = await productsCollection.find(query).toArray();

        // Send the matching products as the response
        res.status(200).json({ products });
      } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    });
    app.delete("/cart/:id/:email", async (req, res) => {
      const { id, email } = req.params;

      try {
        const customer = await customerCollection.findOne({ email: email });

        if (!customer) {
          return res.status(404).json({ message: "Customer not found" });
        }

        if (!customer.cart || customer.cart.length === 0) {
          return res.status(404).json({ message: "Cart is empty" });
        }

        const updatedCart = customer.cart.filter(
          (item) => item !== id
        );

        const result = await customerCollection.updateOne(
          { email: email },
          { $set: { cart: updatedCart } }
        );

        return res
          .status(200)
          .json({ message: "Item removed from cart", products: updatedCart });
      } catch (error) {
        return res.status(500).json({ message: "Error deleting item from cart" });
      }
    });


    // feedback related api ==================================================
    app.post('/feedback', async (req, res) => {
      const data = req.body
      const result = await feedbackCollection.insertOne(data)
      res.send(result)
    })




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