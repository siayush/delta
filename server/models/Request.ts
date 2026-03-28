import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
  folderId?: string;
}

const RequestSchema = new Schema<IRequest>({
  name: { type: String, required: true, default: 'New Request' },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    default: 'GET'
  },
  url: { type: String, default: '' },
  headers: { type: Schema.Types.Mixed, default: {} },
  queryParams: { type: Schema.Types.Mixed, default: {} },
  body: { type: String, default: '' },
  folderId: { type: String, default: undefined }
}, { timestamps: true });

RequestSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IRequest>('Request', RequestSchema);
