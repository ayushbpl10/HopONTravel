// Dynamic config that extends app.json with environment variables
// For production, set these via EAS secrets

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Image upload service keys (fallback to defaults for development)
      imgbbApiKey: process.env.IMGBB_API_KEY || 'c801a65662b845829fe6097c3b1e96f0',
      freeimageApiKey: process.env.FREEIMAGE_API_KEY || '6d207e02198a847aa98d0a2a901485a5',
      
      // Platform Razorpay (Ab Toh Ghoom Le's account for export fees, platform charges)
      // Test key for development, use EAS secrets for production: eas secret:create --name PLATFORM_RAZORPAY_KEY
      platformRazorpayKey: process.env.PLATFORM_RAZORPAY_KEY || 'rzp_test_TWSNTBjCjlxWVy',
      
      // Vendor Payment: Each vendor manages their own Razorpay account
      // Configured in Vendor Dashboard, not here
      
      // Support email
      supportEmail: 'abtohghoomle@gmail.com',
    },
  };
};
