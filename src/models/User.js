import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  avatar:   { type: String, default: null }, // URL or null (use default icon)
  isVerified: { type: Boolean, default: false },
  stats: {
    wins:        { type: Number, default: 0 },
    losses:      { type: Number, default: 0 },
    draws:       { type: Number, default: 0 },
    totalScore:  { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    bestScore:   { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
