const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = 3000;
const MONGO_URL = "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGO_URL);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

async function startServer() {

    try {

        await client.connect();

        console.log("MongoDB connected successfully");

        const db = client.db("cms_lab");

        const postsCollection = db.collection("posts");

        console.log("Database and collection ready");

        app.get("/", async (req, res) => {

            const posts = await postsCollection
                .find({})
                .sort({ createdAt: -1 })
                .toArray();

            res.render("posts", { posts: posts });

        });

        app.get("/posts/new", (req, res) => {
            res.render("new-post");
        });

        app.post("/posts", async (req, res) => {

            const title = req.body.title;
            const content = req.body.content;
            const author = req.body.author;

            if (!title || !content || !author) {
                return res.send("Title, content, and author are required.");
            }

            const newPost = {
                title: title,
                content: content,
                author: author,
                createdAt: new Date()
            };

            await postsCollection.insertOne(newPost);

            res.redirect("/");
        });

        app.get("/posts/:id", async (req, res) => {

            const post = await postsCollection.findOne({
                _id: new ObjectId(req.params.id)
            });

            if (!post) {
                return res.status(404).send("Post not found");
            }

            res.render("post", { post: post });

        });

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {

        console.log("MongoDB connection failed");
        console.log(error);

    }
}
startServer();