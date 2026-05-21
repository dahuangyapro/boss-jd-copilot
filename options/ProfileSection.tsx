import type { AiSettings } from "~lib/storage/options"

import { Field, S, Section, type Patcher } from "./ui"

const PROFILE_PLACEHOLDER =
  "示例：3 年 Go 后端，主做支付/订单方向，熟悉 Kafka 与 ES；\n上家在 xx 公司，独立设计过日交易峰值 50w+ 的清结算模块；\n求职方向：电商/金融科技后端，希望接触高并发与分布式事务"

export const ProfileSection = ({
  settings,
  patch
}: {
  settings: AiSettings
  patch: Patcher
}) => (
  <Section title="个人画像">
    <Field
      label="自我介绍"
      hint="3-5 行：经验年限、技术栈或方向、亮点项目。越具体，招呼语越像你本人写的">
      <textarea
        style={{ ...S.input, ...S.textarea }}
        rows={6}
        value={settings.userProfile}
        placeholder={PROFILE_PLACEHOLDER}
        onChange={(e) => patch({ userProfile: e.target.value })}
      />
    </Field>
  </Section>
)
