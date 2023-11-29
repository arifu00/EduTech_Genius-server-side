const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const teacherRequestCollection = client
      .db("eduTechGenius")
      .collection("teacherRequest");
    const userCollection = client.db("eduTechGenius").collection("users");

    // jwt related api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user, 'user in jwt');
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // custom middle ware
    const verifyToken = async (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      console.log(`token inside verify
      ${token}`);
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // All Class Api
    app.get("/allClasses", async (req, res) => {
      try {
        let sortObj = {};

        const sortField = req.query.sortField;
        // console.log(sortField);
        const sortOrder = req.query.sortOrder;

        if (sortField && sortOrder) {
          sortObj[sortField] = sortOrder;
        }
        const cursor = allClassesCollection.find().sort(sortObj);
        const result = await cursor.toArray();
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

    // teacher request api

    app.post("/teacherRequest", verifyToken, async (req, res) => {
      try {
        const teacherRequest = req.body;
        const result = await teacherRequestCollection.insertOne(teacherRequest);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/teacherRequest", verifyToken, async (req, res) => {
      try {
        let query = {};
        if (req.query.email) {
          const email = req.query.email;
          query = { email: email };
        }
        // console.log(query, 'query');
        const result = await teacherRequestCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.patch(
      "/teacherRequest/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const email = req.params.email;
          const filter = { email: email };
          const updatedDoc = {
            $set: {
              status: "Accepted",
            },
          };
          const result = await teacherRequestCollection.updateOne(
            filter,
            updatedDoc
          );
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      }
    );
    app.delete(
      "/teacherRequest/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const result = await teacherRequestCollection.deleteOne(filter);
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      }
    );

    // Enroll Class Api

    app.post("/enrollClass", verifyToken, async (req, res) => {
      try {
        const enrollClass = req.body;
        const result = await enrollClassCollection.insertOne(enrollClass);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/enrollClass", verifyToken, async (req, res) => {
      try {
        let query = {};
        if (req.query.email) {
          const email = req.query.email;
          query = { userEmail: email };
        }
        // console.log(query, 'query');
        const result = await enrollClassCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // user api

    app.post("/user", async (req, res) => {
      const user = req.body;
      try {
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "user already exists", insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/user", async (req, res) => {
      try {
        let query = {};
        if (req.query.email) {
          const email = req.query.email;
          query = { email: email };
        }
        // console.log(query, 'query');
        const result = await userCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.patch(
      "/user/teacher/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const email = req.params.email;
          const filter = { email: email };
          const updatedDoc = {
            $set: {
              role: "Teacher",
            },
          };
          const result = await userCollection.updateOne(filter, updatedDoc);
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      }
    );
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "Admin";
        }
        res.send({ admin });
      } catch (error) {
        console.log(error);
      }
    });
    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "Admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
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
