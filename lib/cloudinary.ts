import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadAvatar(
  file: string,
  userId: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(file, {
    folder: "skillswap/avatars",
    public_id: userId,
    overwrite: true,
    transformation: [{ width: 200, height: 200, crop: "fill" }],
  });
  return result.secure_url;
}

export async function uploadDeliverable(
  file: string,
  swapId: string,
  userId: string,
  resourceType: "image" | "raw"
): Promise<{ url: string }> {
  const result = await cloudinary.uploader.upload(file, {
    folder: "skillswap/deliverables",
    public_id: `${swapId}-${userId}-${Date.now()}`,
    resource_type: resourceType,
  });
  return { url: result.secure_url };
}

export async function uploadMessageFile(
  file: string,
  messageId: string,
  resourceType: "image" | "raw"
): Promise<{ url: string }> {
  const result = await cloudinary.uploader.upload(file, {
    folder: "skillswap/messages",
    public_id: messageId,
    overwrite: true,
    resource_type: resourceType,
  });
  return { url: result.secure_url };
}

export default cloudinary;
