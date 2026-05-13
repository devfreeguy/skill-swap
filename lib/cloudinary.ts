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

export default cloudinary;
