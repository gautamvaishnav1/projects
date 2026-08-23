import mongoose from "mongoose";

export interface ProjectDocument extends mongoose.Document {
  name: string;
  description?: string;
  repoUrl: string;
  /** "github" (default) or "demo" — demo projects scan the bundled ./demo dir, no download */
  source?: "github" | "demo";
  owner: mongoose.Types.ObjectId;
  lastAnalysis?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new mongoose.Schema<ProjectDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => /github\.com/i.test(v) || v.startsWith("demo://"),
        message: "repoUrl must be a GitHub repository URL (or demo:// for the bundled demo)"
      }
    },
    source: { type: String, enum: ["github", "demo"], default: "github" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", default: null }
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, repoUrl: 1 });

projectSchema.set("toJSON", {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    const plain = ret as unknown as Record<string, unknown>;
    plain.id = String(plain._id);
    delete plain._id;
    return plain;
  }
});

export const ProjectModel = mongoose.model<ProjectDocument>("Project", projectSchema);
