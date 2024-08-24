const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    content: { type: String, trim: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // up here is we created user object

    pinned: Boolean,
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // here we created array of user object for like field and also for retweetuser

    // the below field is going to be the fieldthat stores all the users who have retweeted this post

    retweetUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // its the id of the post we are retweeting on

    retweetData: { type: Schema.Types.ObjectId, ref: "Post" },
    replyTo: { type: Schema.Types.ObjectId, ref: "Post" },
    pinned: Boolean,
  },
  { timestamps: true }
);

var Post = mongoose.model("Post", PostSchema);
// so here  schema or table structure for post is created

module.exports = Post;
