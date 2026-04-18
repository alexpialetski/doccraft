export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Keep strict subject-length rule off so generated release commits pass.
    'subject-case': [0],
  },
};
