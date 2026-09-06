const mongoose = require('mongoose');

const externalSignalSchema = new mongoose.Schema({
  signalId: { type: String, required: true, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['MANDI_PRICE', 'WEATHER', 'FESTIVAL', 'WEATHER_ALERT']
  },
  commodity: { type: String, default: null },
  location: { type: String, default: null },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

externalSignalSchema.index({ type: 1, isActive: 1 });
externalSignalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('ExternalSignal', externalSignalSchema);
