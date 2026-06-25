# npm 发布标准工作流

> 日期：2026-06-25  
> 仓库：`node-backend-core`  
> 包名：`@usethink/node-backend-core`

---

## 一、发布流程

### 1. 本地修改代码后 bump 版本

```bash
# 编辑 package.json 中的 version 字段
```

### 2. 提交并打 tag

```bash
git add -A
git commit -m "chore: bump version to x.y.z"
git tag vx.y.z
git push && git push origin vx.y.z
```

### 3. GitHub Actions 自动执行

```
test → publish ✅
```

### 4. Token 管理

- 使用 **Granular Access Token**（非 Classic）
- **bypass 2FA** 必须开启
- Token 过期后重新生成并更新 GitHub Secret

---

## 二、GitHub Secret 更新脚本

```bash
NPM_TOKEN="npm_你的granular_token" bash scripts/setup-github-secrets.sh
```

---

## 三、踩坑记录

### 3.1 npm publish 403 错误

**现象**：
```
npm error code E403
npm error 403 Forbidden - PUT https://registry.npmjs.org/@usethink%2fnode-backend-core
npm error Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

**根因**：使用的 classic token 或未开启 `bypass 2FA` 的 granular token，不满足 scope 包的发布策略要求。

**修复**：
1. 登录 npm，进入 **Settings → Tokens**
2. 生成 **Granular Access Token**
3. 配置令牌：
   - **Packages and scopes**：选择 `@usethink/node-backend-core`
   - 权限：**Publish**
   - **bypass 2FA**：必须设置为 **true**
4. 更新 GitHub Secret：
   ```bash
   NPM_TOKEN="npm_你的新token" bash scripts/setup-github-secrets.sh
   ```

### 3.2 私有包发布错误

**现象**：
```
npm error code E402
npm error 402 Payment Required - PUT https://registry.npmjs.org/@usethink%2fnode-backend-core - You must sign up for private packages
```

**根因**：`npm publish` 默认将 scope 包发布为私有，需要显式指定 `--access public`。

**修复**：在 `package.json` 中添加：
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

或在 workflow 中使用：
```yaml
npm publish --access public
```

---

## 四、经验教训

1. **scope 包不等于个人包**：`@scope/name` 的发布权限由组织/包策略决定，不能假设个人账号设置等同于包设置。
2. **Granular Access Token 是必须的**：CI/CD 场景应优先使用 granular token 并显式开启 `bypass 2FA`。
3. **scope 包默认私有**：发布 `@scope/name` 包时必须显式指定 `--access public` 或配置 `publishConfig.access`。
4. **403 要读全错误信息**：npm 的 403 错误明确说明了 `bypass 2fa enabled is required`，应直接按提示修复。
