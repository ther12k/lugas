const secret = process.env.LUGAS_REQUIRED_SECRET;
if (!secret) throw new Error("LUGAS_REQUIRED_SECRET must be set");
export default secret;
