#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
填充 GitHub 拥有者并重建 package.zip。

用法:
    python prepare.py <github用户名> [版本号]

示例:
    python prepare.py zhangsan
    python prepare.py zhangsan 0.5.4
"""
import io
import json
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
INCLUDE = ["plugin.json", "index.js", "index.css", "icon.png", "i18n", "README.md", "README.zh-CN.md"]


def patch(path, owner=None, version=None):
    full = os.path.join(HERE, path)
    with io.open(full, encoding="utf-8") as f:
        text = f.read()
    if owner:
        text = text.replace("__OWNER__", owner)
    if version:
        data = json.loads(text)
        data["version"] = version
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    with io.open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def build_zip():
    out = os.path.join(HERE, "package.zip")
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for item in INCLUDE:
            full = os.path.join(HERE, item)
            if os.path.isdir(full):
                for root, _dirs, files in os.walk(full):
                    for name in sorted(files):
                        p = os.path.join(root, name)
                        z.write(p, os.path.relpath(p, HERE).replace("\\", "/"))
            elif os.path.exists(full):
                z.write(full, item)
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    owner = sys.argv[1].strip()
    version = sys.argv[2].strip() if len(sys.argv) > 2 else None

    patch("plugin.json", owner, version)
    patch("LICENSE", owner)

    pj = json.load(io.open(os.path.join(HERE, "plugin.json"), encoding="utf-8"))
    out = build_zip()
    print("owner   :", pj["author"])
    print("url     :", pj["url"])
    print("version :", pj["version"])
    print("zip     :", out)
    print()
    print("下一步（在 GitHub 上）：")
    print("  1. 新建公开仓库 %s （名字必须正好是 buleks-todo）" % pj["name"])
    print("  2. 推送本目录：git remote add origin https://github.com/%s/%s.git && git push -u origin main" % (owner, pj["name"]))
    print("  3. 发 Release，tag 用 v%s，附件上传本目录下的 package.zip" % pj["version"])
    print("  4. Fork siyuan-note/bazaar，在 plugins.txt 里加一行：%s/%s 然后提 PR" % (owner, pj["name"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
