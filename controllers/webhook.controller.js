import { Webhook } from "svix";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";

export const clerkWebhook = async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK SECRET IS NEEDED!");
  }

  const payload = req.body;
  const headers = req.headers;

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;
  try {
    evt = wh.verify(payload, headers);
  } catch (error) {
    return res.status(400).json({
      message: "Webhook verification failed.",
    });
  }

  if (evt.type === "user.created") {
    const username =
      evt.data.username && evt.data.username.trim() !== ""
        ? evt.data.username
        : evt.data.email_addresses[0].email_address;
    const newUser = new User({
      clerkUserId: evt.data.id,
      userName: username,
      email: evt.data.email_addresses[0].email_address,
      img: evt.data.image_url || evt.data.profile_img_url,
    });

    await newUser.save();
  }

  if (evt.type === "user.deleted") {
    const deletedUser = await User.findOneAndDelete({
      clerkUserId: evt.data.id,
    });
    if (deletedUser) {
      await Post.deleteMany({ user: deletedUser._id });
      await Comment.deleteMany({ user: deletedUser._id });
    }
  }

  if (evt.type === "user.updated") {
    const user = await User.findOne({clerkUserId: evt.data.id })
    if(user){
      user.img = evt.data.image_url || evt.data.profile_img_url;
      user.email = evt.data.email_addresses[0].email_address;
      const username =
      evt.data.username && evt.data.username.trim() !== ""
        ? evt.data.username
        : evt.data.email_addresses[0].email_address;
      user.userName = username;
      user.save();
    }
  }

  return res.status(200).json({
    message: "Webhook received",
  });
};
