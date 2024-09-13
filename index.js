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


    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);

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