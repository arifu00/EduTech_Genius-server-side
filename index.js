const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//  middle-ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kalsdro.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    // service api
    const allClassesCollection = client
      .db("eduTechGenius")
      .collection("allClasses");
    const enrollClassCollection = client
      .db("eduTechGenius")
      .collection("enrollClass");

    // All Class Api
    app.get("/allClasses", async (req, res) => {
      try {
        const result = await allClassesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/allClasses/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await allClassesCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // Enroll Class Api

    app.post("/enrollClass", async (req, res) => {
      try {
        const enrollClass = req.body;
        const result = await enrollClassCollection.insertOne(enrollClass);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/enrollClass", async (req, res) => {
      try {
        const result = await enrollClassCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.log(error);
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EduTech Genius Server is Running");
});
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
