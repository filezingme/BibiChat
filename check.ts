import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const directMessageSchema = new mongoose.Schema({ id: String, senderId: String, receiverId: String, content: String, timestamp: Number, isRead: Boolean, type: String, replyToId: String, reactions: [], groupId: String }, { collection: 'directmessages' });
const DirectMessage = mongoose.model('DirectMessageTest', directMessageSchema);

const userSchema = new mongoose.Schema({ id: String, email: String });
const User = mongoose.model('UserTest', userSchema, 'users');

async function check() {
  const MONGODB_URI = "mongodb+srv://bibichat:DungTqX01E2O76i2@bibichat.yq5tq.mongodb.net/?retryWrites=true&w=majority&appName=bibichat";
  const dbName = "bibichat";
  await mongoose.connect(MONGODB_URI, { dbName } as any);
  
  const users = await User.find();
  const validIds = users.map(u => u.id);
  console.log('Valid user IDs:', validIds);
  
  const msgs = await DirectMessage.find();
  console.log('All msgs count:', msgs.length);
  
  const ghostMsgs = await DirectMessage.find({ senderId: { $nin: validIds }, receiverId: { $in: validIds } });
  console.log('Ghost sender msgs count:', ghostMsgs.length);

  const ghostReceiverMsgs = await DirectMessage.find({ receiverId: { $nin: validIds }, senderId: { $in: validIds } });
  console.log('Ghost receiver msgs count:', ghostReceiverMsgs.length);

  const unreadCount = await DirectMessage.countDocuments({ isRead: false });
  console.log('Unread msgs total:', unreadCount);

  for (const m of msgs) {
      if (m.isRead === false) {
          console.log(`Unread msg: sender=${m.senderId}, receiver=${m.receiverId}, content=${m.content}`);
      }
  }
  
  process.exit();
}
check();
