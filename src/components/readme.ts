import fs from "fs";
import path from "path";
import type { TREADMESources, TREADMEEPGSources } from "../types"
import { handle_m3u, get_from_info } from "../utils"

export const updateChannelList = (
  name: string,
  f_name: string,
  m3u: string,
  rollback: boolean = false
) => {
  const list_temp_p = path.join(path.resolve(), "src/tmpl/LIST.tmpl.md")
  const list = fs.readFileSync(list_temp_p, "utf8").toString()
  const m3uArray = handle_m3u(m3u)
  const channelRegExp = /\#EXTINF:-1([^,]*),(.*)/
  let i = 1
  let channels: Array<string>[] = []
  while (i < m3uArray.length) {
    const reg = channelRegExp.exec(m3uArray[i]) as RegExpExecArray
    channels.push([
      reg[2].replace(/\|/g, "").trim(),
      get_from_info(m3uArray[i + 1]),
      m3uArray[i + 1],
    ])
    i += 2
  }
  const after = list
    .replace(
      "<!-- list_title_here -->",
      `# List for **${name}**${rollback ? "(Rollback)" : ""
      }\n\n> M3U: [${f_name}.m3u](/${f_name}.m3u), TXT: [${f_name}.txt](/txt/${f_name}.txt)`
    )
    .replace(
      "<!-- channels_here -->",
      `${channels
        ?.map(
          (c, idx) =>
            `| ${idx + 1} | ${c[0].replace("|", "")} | ${c[1]} | <${c[2]
            }> |`
        )
        .join("\n")}\n\nUpdated at **${new Date()}**`
    )
  const list_p = path.join(path.resolve(), "dist", "list")
  if (!fs.existsSync(list_p)) {
    fs.mkdirSync(list_p)
  }
  fs.writeFileSync(path.join(list_p, `${f_name}.list.md`), after)
}


export const updateReadme = (
  sources: TREADMESources,
  sources_res: Array<[string, number | undefined]>,
  epgs: TREADMEEPGSources,
  epgs_res: Array<[string | undefined]>
) => {
  const readme_temp_p = path.join(path.resolve(), "src/tmpl/README.tmpl.md")
  const readme = fs.readFileSync(readme_temp_p, "utf8").toString()
  const after = readme
    .replace(
      "<!-- channels_here -->",
      `${sources
        ?.map(
          (s, idx) =>
            `| ${s.name} | [${s.f_name}.m3u](/${s.f_name
            }.m3u) <br> [${s.f_name}.txt](/txt/${s.f_name
            }.txt) | [List for ${s.name}](/list/${s.f_name
            }.list) | ${sources_res?.[idx]?.[1] === undefined
              ? "update failed"
              : sources_res[idx][1]
            } | ${sources_res?.[idx]?.[0] === "rollback" ? "✅" : "-"
            } |`
        )
        .join("\n")}`
    )
    .replace(
      "<!-- epgs_here -->",
      `${epgs
        ?.map(
          (e, idx) =>
            `| ${e.name} | [${e.f_name}.xml](/epg/${e.f_name
            }.xml) | ${!!epgs_res?.[idx]?.[0]
              ? epgs_res?.[idx]?.[0] === "rollback"
                ? "✅"
                : "-"
              : "update failed"
            } |`
        )
        .join("\n")}\n\nUpdated at **${new Date()}**`
    )
  if (!fs.existsSync(path.join(path.resolve(), "dist"))) {
    fs.mkdirSync(path.join(path.resolve(), "dist"))
  }
  fs.writeFileSync(path.join(path.resolve(), "dist", "README.md"), after)
}