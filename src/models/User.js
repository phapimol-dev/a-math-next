import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  // OAuth provider info
  authProvider: { type: String, default: 'credentials' }, // 'google', 'facebook', 'github'
  authProviderId: { type: String, default: null },
  avatar:   { type: String, default: null },
  stats: {
    wins:        { type: Number, default: 0 },
    losses:      { type: Number, default: 0 },
    draws:       { type: Number, default: 0 },
    totalScore:  { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    bestScore:   { type: Number, default: 0 },
    bestTurnScore: { type: Number, default: 0 }
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
