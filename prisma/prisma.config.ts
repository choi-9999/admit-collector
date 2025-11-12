import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

export default {
  schema: './prisma/schema.prisma',
}