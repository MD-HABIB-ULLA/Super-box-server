const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 3000;


// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true
}));
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
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


    // user related api===================================================================

    app.post('/users', async (req, res) => {
      const user = req.body;
 

      // insert email if user doesn't exist
      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send("helo");
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });


    // role define =========================================================
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      
      const query = { email: email };
      const user = await userCollection.findOne(query);

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      if (user.role === "admin") {
        return res.send({ role: 'admin' });
      }
      if (user.role === "seller") {
        return res.send({ role: 'seller' });
      }
      return res.send({ role: "user" });
    });


    // website related api 

    app.post("/createWebsite", async (req, res) => {
      const webData = req.body
      const newSellerEmail = req.body.email
      const query = { email: newSellerEmail };
      const user = await userCollection.findOne(query);

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      const update = {
        $set: {
          role: "seller", // Update the role field to 'seller'
        },
      };
      const updateRole = await userCollection.updateOne(query, update);
      const result = await webCollection.insertOne(webData)
      console.log(webData)
      res.send({ updateRole, result })
    })

    app.get("/webData/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await webCollection.findOne(query)
      res.send(result)
    })
    app.get("/w/:name", async (req, res) => {
      const name = req.params.name;

      const query = { "webInfo.shopName": name }
      const result = await webCollection.findOne(query)
      res.send(result)
    })

    // products related api 
    app.get("/products/:email", async (req, res) => {
      const email = res.params 
      const query = {email : email}
      const result = await productsCollection.find(query).toArray()
      res.send(result)
    })

    app.get("/products/:name", async (req, res) => {
      const name = res.params 
      console.log(name)
      const query = {shopName : name}
      const result = await productsCollection.find(query).toArray()
      res.send(result)
    })

    // customer related api ================================================
    app.post('/customer', async (req, res) => {
      const user = req.body;
 

      // insert email if user doesn't exist
      const query = { email: user?.email };
      const existingUser = await customerCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await customerCollection.insertOne(user);
      res.send("helo");
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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