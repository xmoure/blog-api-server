import ImageKit from "imagekit";
import postModel from "../models/post.model.js";
import userModel from "../models/user.model.js";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom"
import sanitizeHtml from "sanitize-html";

// Create a DOMPurify instance using JSDOM
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

export const getPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;

  const query = {};
  const category = req.query.cat;
  const author = req.query.author;
  const searchQuery = req.query.search;
  const featured = req.query.featured;
  const sortQuery = req.query.sort;

  if (category && category !== "general") {
    query.category = category;
  }

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: "i" };
  }
  if (author) {
    const user = await userModel.findOne({ userName: author }).select("_id");
    if (!user) {
      return res.status(404).json("No posts found");
    }
    query.user = user._id;
  }

  let sortObj = { createdAt: -1 };

  if (sortQuery) {
    switch (sortQuery) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "popular":
        sortObj = { visit: -1 };
        break;
      case "trending":
        sortObj = { visit: -1 };
        query.createdAt = {
          $gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        sortObj = { createdAt: -1 };
        break;
    }
  }

  if (featured) {
    query.isFeatured = true;
  }

  const posts = await postModel
    .find(query)
    .populate("user", "userName")
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);
  const totalPosts = await postModel.countDocuments();
  const hasMore = page * limit < totalPosts;
  res.status(200).json({ posts, hasMore });
};

export const getPost = async (req, res) => {
  const post = await postModel
    .findOne({ slug: req.params.slug })
    .populate("user", "userName img");
  if (!post) {
    return res.status(404).json("Post not found");
  }
  // Sanitize again before sending to frontend
  post.content = DOMPurify.sanitize(post.content);
  res.status(200).json(post);
};

export const createPost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  if (!clerkUserId) {
    return res.status(401).json("not authenticated");
  }
  const user = await userModel.findOne({ clerkUserId });
  if (!user) {
    return res.status(404).json("User not found");
  }

  //Sanitize the title to remove any HTML tags
  const sanitizedTitle = sanitizeHtml(req.body.title, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {}, // No attributes allowed
  }).trim();

  const sanitizedDescription = sanitizeHtml(req.body.description, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {}, // No attributes allowed
  }).trim();

  let slug = sanitizedTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
  let existingPost = await postModel.findOne({ slug });
  let counter = 2;
  while (existingPost) {
    slug = `${slug}-${counter}`;
    existingPost = await postModel.findOne({ slug });
    counter++;
  }

  /* const sanitizedContent = DOMPurify.sanitize(req.body.content); */

  const newPost = new postModel({
    user: user._id,
    slug,
    title: sanitizedTitle,
    content: req.body.content,
    category: req.body.category,
    description: sanitizedDescription,
    img: req.body.img,
  });

  //const newPost = new postModel({ user: user._id, slug, ...req.body });
  const post = await newPost.save();
  res.status(200).json(post);
};

export const deletePost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  if (!clerkUserId) {
    return res.status(401).json("not authenticated");
  }
  const role = req.auth.sessionClaims?.metadata?.role || "user";

  if (role === "admin") {
    await postModel.findByIdAndDelete(req.params.id);
    return res.status(200).json("Post has been deleted");
  }

  const user = await userModel.findOne({ clerkUserId });
  if (!user) {
    return res.status(404).json("User not found");
  }
  const deletedPost = await postModel.findOneAndDelete({
    _id: req.params.id,
    user: user._id,
  });

  if (!deletedPost) {
    res.status(403).json("You can only delete your own posts");
  }

  res.status(200).json("Post has been deleted");
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IK_URL_ENDPOINT,
  publicKey: process.env.IK_PUBLIC_KEY,
  privateKey: process.env.IK_PRIVATE_KEY,
});

export const uploadAuth = async (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
};

export const featurePost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    return res.status(401).json("not authenticated");
  }
  const role = req.auth.sessionClaims?.metadata?.role || "user";

  if (role !== "admin") {
    return res.status(403).json("You cannot feature posts");
  }

  const post = await postModel.findById(postId);
  if (!post) {
    return res.status(404).json("Post not found");
  }

  const isFeatured = post.isFeatured;
  const updatedPost = await postModel.findByIdAndUpdate(
    postId,
    { isFeatured: !isFeatured },
    { new: true }
  );

  res.status(200).json(updatedPost);
};
