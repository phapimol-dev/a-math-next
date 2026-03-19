import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  players: [{
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    score:    { type: Number, default: 0 },
    isBot:    { type: Boolean, default: false }
  }],
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDraw:   { type: Boolean, default: false },
  reason:   { type: String, default: 'normal' }, // normal, resignation, timeout
  duration: { type: Number, default: 0 },         // milliseconds
  playedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Match || mongoose.model('Match', matchSchema);
