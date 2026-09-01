import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
    },
  },
];
