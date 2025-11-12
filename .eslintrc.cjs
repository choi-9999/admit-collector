// .eslintrc.cjs
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // any 허용 (eslint 오류 무시)
    '@typescript-eslint/no-explicit-any': 'off',

    // 미사용 변수는 경고로 낮춤 + 언더스코어(_)로 시작하면 무시
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
