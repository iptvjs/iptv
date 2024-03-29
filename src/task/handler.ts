import fs from "fs"
import path from "path"

import type { IEnv } from "../types"
import { trimAny, config_path } from "../utils"

export const loadConfigEnv = (): IEnv | undefined => {
  if (!fs.existsSync(config_path)) {
    return void 0
  }

  if (fs.readdirSync(config_path).length === 0) {
    return void 0
  }

  const cfg = trimAny(
    JSON.parse(
      fs.readFileSync(path.join(config_path, "env.json"), "utf-8")
    ) as IEnv
  )

  return cfg
}
