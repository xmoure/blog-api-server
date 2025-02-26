import userModel from "../models/user.model.js";

export const getUserSavedPosts = async (req, res) => {
  const clerkUserId = req.auth.userId;
  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }
  const user = await userModel.findOne({ clerkUserId });
  res.status(200).json(user.savedPosts);
};

export const savePost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.body.postId;
  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }
  const user = await userModel.findOne({ clerkUserId });
  const isSaved = user.savedPosts.some((post) => post === postId);
  if(!isSaved){
    await userModel.findByIdAndUpdate(user._id, {
        $push: {savedPosts: postId},
    });
  }else {
    await userModel.findByIdAndUpdate(user._id, {
        $pull: {savedPosts: postId},
    })
  }
  res.status(200).json(isSaved ? "Post unsaved" : "Post saved");
};
