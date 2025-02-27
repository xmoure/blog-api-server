import express from "express";
import userRouter from './routes/user.route.js';
import postRouter from './routes/post.route.js';
import commentRouter from './routes/comment.route.js';
import webhookRouter from './routes/webhook.route.js';
import connectDB from './lib/connectDB.js';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import cors from 'cors';

import dotenv from "dotenv";
dotenv.config();


const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL?.replace(/\/$/, "") || "*", // Removes trailing slash if present
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Explicitly allow headers
    optionsSuccessStatus: 204 // Handles preflight requests correctly
}));


app.use(clerkMiddleware());
app.use("/webhooks", webhookRouter);
app.use(express.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

/* app.get("/auth-state", (req,res) => {
    const authState = req.auth;
    res.json(authState);
})

app.get("/protect", (req,res) => {
    const {userId} = req.auth;
    if(!userId){
        return res.status(401).json("not authenticated");
    }
    res.status(200).json("content");
}) */

/* app.get("/protected2", requireAuth(), (req, res) => {
    res.status(200).json("content");
}) */

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);

app.use((error, req, res, next ) => {
    res.status(error.status || 500).json({
        message: error.message || "Something went wrong",
        status: error.status,
    });
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    connectDB();
    console.log("Server is running");
});