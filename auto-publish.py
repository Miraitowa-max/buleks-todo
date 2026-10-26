#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
全自动把 buleks-todo 插件发布到思源集市。

用法（token 通过环境变量传入，不落盘、不入 git）：
    GITHUB_TOKEN=ghp_xxx python auto-publish.py

流程：
  1. 用 token 校验身份并取得 GitHub 用户名
  2. 创建公开仓库 <owner>/buleks-todo（已存在则复用）
  3. 填入 plugin.json 的 author/url，重建 package.zip，git 提交并推送 main
  4. 创建 Release（tag v<version>），上传 package.zip
  5. Fork siyuan-note/bazaar，在 plugins.txt 追加一行 <owner>/buleks-todo
  6. 向 siyuan-note/bazaar:main 提 PR
"""
import base64
import io
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.github.com"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.join(HERE, "repo-buleks-todo")
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
PLUGIN_NAME = "buleks-todo"


def call(method, path, payload=None, raw=None, ctype="application/json", ok_404=False):
    url = path if path.startswith("http") else API + path
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
    elif raw is not None:
        data = raw
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "buleks-todo-publisher")
    if data is not None:
        req.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read()
            return r.status, (json.loads(body) if body.strip().startswith((b"{", b"[")) else body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        if ok_404 and e.code == 404:
            return 404, None
        raise RuntimeError("HTTP %s %s %s -> %s" % (e.code, method, url, body[:500]))


def git(*args, url=None):
    cmd = ["git"] + list(args)
    p = subprocess.run(cmd, cwd=REPO_DIR, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError("git %s failed: %s %s" % (" ".join(args), p.stdout, p.stderr))
    return p.stdout


def step(msg):
    print("[*] " + msg, flush=True)


def main():
    if not TOKEN:
        print(__doc__)
        return 1

    # 1. 身份
    _, me = call("GET", "/user")
    owner = me["login"]
    step("身份校验通过：%s" % owner)

    # 2. 填 author/url 并重建 zip
    sys.path.insert(0, REPO_DIR)
    import importlib
    prepare = importlib.import_module("prepare")
    prepare.patch("plugin.json", owner)
    prepare.patch("LICENSE", owner)
    pj = json.load(io.open(os.path.join(REPO_DIR, "plugin.json"), encoding="utf-8"))
    version = pj["version"]
    zip_path = prepare.build_zip()
    step("plugin.json 已填充：author=%s url=%s version=%s" % (pj["author"], pj["url"], version))

    # 3. 仓库
    status, repo = call("GET", "/repos/%s/%s" % (owner, PLUGIN_NAME), ok_404=True)
    if status == 404:
        step("创建仓库 %s/%s ..." % (owner, PLUGIN_NAME))
        _, repo = call("POST", "/user/repos", {
            "name": PLUGIN_NAME,
            "description": "Blueks代办 - 思源待办看板插件",
            "homepage": "https://github.com/%s/%s" % (owner, PLUGIN_NAME),
            "private": False,
            "has_issues": True,
        })
    else:
        step("仓库已存在，复用")
    step("仓库地址：%s" % repo["html_url"])

    # 4. 推送主分支
    remote = "https://x-access-token:%s@github.com/%s/%s.git" % (TOKEN, owner, PLUGIN_NAME)
    git("add", "-A")
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=REPO_DIR)
    if diff.returncode != 0:
        git("-c", "user.name=%s" % owner, "-c", "user.email=%s@users.noreply.github.com" % owner,
            "commit", "-m", "release: v%s" % version)
    # 分支名统一 main
    try:
        git("branch", "-M", "main")
    except RuntimeError:
        pass
    step("推送 main ...")
    git("push", "-f", remote, "main")
    step("推送完成")

    # 5. Release + package.zip
    tag = "v" + version
    status, rel = call("GET", "/repos/%s/%s/releases/tags/%s" % (owner, PLUGIN_NAME, tag), ok_404=True)
    if status == 404:
        step("创建 Release %s ..." % tag)
        _, rel = call("POST", "/repos/%s/%s/releases" % (owner, PLUGIN_NAME), {
            "tag_name": tag,
            "name": tag,
            "body": "Blueks代办 %s\n\n- 状态流转 / 分组 / 标签\n- 按年归档、批量操作、历史清单导入\n- 近7天汇总（含已完成+已关闭）" % version,
            "draft": False,
            "prerelease": False,
        })
    else:
        step("Release 已存在，复用")

    # 删除同名旧附件后再上传，避免 zip 不更新
    _, assets = call("GET", "/repos/%s/%s/releases/%s/assets" % (owner, PLUGIN_NAME, rel["id"]))
    for a in assets if isinstance(assets, list) else []:
        if a.get("name") == "package.zip":
            call("DELETE", "/repos/%s/%s/releases/assets/%s" % (owner, PLUGIN_NAME, a["id"]))
            step("已删除旧 package.zip（将重新上传）")
    with open(zip_path, "rb") as f:
        zdata = f.read()
    upload_url = rel["upload_url"].split("{")[0] + "?name=package.zip"
    call("POST", upload_url, raw=zdata, ctype="application/zip")
    step("package.zip 已上传（%d 字节）" % len(zdata))

    # 6. Fork bazaar
    _, fork = call("GET", "/repos/%s/bazaar" % owner, ok_404=True)
    if fork is None:
        step("Fork siyuan-note/bazaar ...")
        call("POST", "/repos/siyuan-note/bazaar/forks", {"default_branch_only": True})
        for _ in range(30):
            time.sleep(3)
            st, fork = call("GET", "/repos/%s/bazaar" % owner, ok_404=True)
            if st == 200:
                break
        time.sleep(3)
    else:
        step("bazaar fork 已存在，复用")
    step("fork 就绪：%s" % fork["full_name"])

    # 7. plugins.txt 追加一行
    st, content = call("GET", "/repos/%s/bazaar/contents/plugins.txt" % owner)
    text = base64.b64decode(content["content"]).decode("utf-8")
    entry = "%s/%s" % (owner, PLUGIN_NAME)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if entry not in lines:
        new_text = ("\n".join(lines) + "\n" + entry + "\n")
        call("PUT", "/repos/%s/bazaar/contents/plugins.txt" % owner, {
            "message": "Add plugin: %s" % PLUGIN_NAME,
            "content": base64.b64encode(new_text.encode()).decode(),
            "sha": content["sha"],
            "branch": fork["default_branch"],
        })
        step("plugins.txt 已追加：%s" % entry)
    else:
        step("plugins.txt 已含该行，跳过")

    # 8. PR
    st, prs = call("GET", "/repos/siyuan-note/bazaar/pulls?state=open&per_page=100")
    head = "%s:%s" % (owner, fork["default_branch"])
    existing = [p for p in prs if p["head"]["label"] == head]
    if existing:
        step("已有打开的 PR：#%s %s" % (existing[0]["number"], existing[0]["html_url"]))
        print("PR_URL=" + existing[0]["html_url"])
        return 0

    body = """### 新增插件 / Add plugin

- 仓库 / Repo: {owner}/{name}
- 类型 / Type: plugin
- 插件名 / Name: {name}（Blueks代办）
- 版本 / Version: {ver}
- 说明 / Description: 独立待办看板：状态流转、分组与标签、按年归档、批量操作、历史清单导入、近7天汇总

- [x] 我是该插件的作者，或已获得作者授权提交到思源集市
- [x] 包内许可允许再分发（MIT）
- [x] Latest Release 已上传 package.zip
""".format(owner=owner, name=PLUGIN_NAME, ver=version)

    step("创建 PR ...")
    st, pr = call("POST", "/repos/siyuan-note/bazaar/pulls", {
        "title": "Add plugin: %s" % PLUGIN_NAME,
        "head": head,
        "base": "main",
        "body": body,
    })
    step("PR 已创建：%s" % pr["html_url"])
    print("PR_URL=" + pr["html_url"])
    print("REPO_URL=%s" % repo["html_url"])
    print("RELEASE_URL=%s" % rel["html_url"])
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("FAILED: %s" % e)
        sys.exit(2)
