import commentModel from "../models/comment.model.js";
import userModel from "../models/user.model.js";

export const getPostComments = async (req, res) => {
  const comment = await commentModel
    .find({
      post: req.params.postId,
    })
    .populate("user", "userName img")
    .sort({ createdAt: -1 });

  res.json(comment);
};

export const addComment = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.params.postId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await userModel.findOne({ clerkUserId });
  const newComment = new commentModel({
    ...req.body,
    user: user._id,
    post: postId,
  });
  const savedComment = await newComment.save();
  res.status(201).json(savedComment);
};

export const deleteComment = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const id = req.params.id;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const role = req.auth.sessionClaims?.metadata?.role || "user";

  if (role === "admin") {
    await commentModel.findByIdAndDelete(req.params.id);
    return res.status(200).json("Comment has been deleted");
  }

  const user = await userModel.findOne({ clerkUserId });
  const deletedComment = await commentModel.findOneAndDelete({
    _id: id,
    user: user._id,
  });

  if (!deletedComment) {
    return res.status(403).json("You can only delete your own comments");
  }
  return res.status(200).json("Your comment has been deleted");
};
