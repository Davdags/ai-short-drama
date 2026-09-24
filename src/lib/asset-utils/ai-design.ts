import { logError as _ulogError } from '@/lib/logging/core'
/**
 * AI 设计共享工具函数
 * 统一处理 Asset Hub 和 Studio 的 AI 设计逻辑
 */

import { executeAiTextStep } from '@/lib/ai-runtime'
import { withTextBilling } from '@/lib/billing'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'
import type { Locale } from '@/i18n/routing'

export type AssetType = 'character' | 'location'

export interface AIDesignOptions {
    userId: string
    locale: Locale
    analysisModel: string
    userInstruction: string
    assetType: AssetType
    /** 用于计费的上下文：'asset-hub' 或实际的 projectId */
    projectId?: string
    /** 任务 worker 内执行时使用，避免和任务计费重复 */
    skipBilling?: boolean
}

export interface AIDesignResult {
    success: boolean
    prompt?: string
    error?: string
}

/**
 * AI 设计通用函数
 * 根据用户指令生成角色或场景的 prompt 描述
 */
export async function aiDesign(options: AIDesignOptions): Promise<AIDesignResult> {
    const {
        userId,
        locale,
        analysisModel,
        userInstruction,
        assetType,
        projectId = 'asset-hub',
        skipBilling = false,
    } = options

    if (!userInstruction?.trim()) {
        return {
            success: false,
            error: assetType === 'character' ? 'Please describe the character you want' : 'Please describe the location you want'
        }
    }

    if (!analysisModel) {
        return {
            success: false,
            error: 'Please choose an analysis model in Model preferences first'
        }
    }

    let finalPrompt: string
    try {
        finalPrompt = buildPrompt({
            promptId: assetType === 'character'
                ? PROMPT_IDS.NP_CHARACTER_CREATE
                : PROMPT_IDS.NP_LOCATION_CREATE,
            locale,
            variables: {
                user_input: userInstruction,
            },
        })
    } catch {
        _ulogError('[AI Design] 提示词加载失败')
        return { success: false, error: 'System configuration error' }
    }

    // 调用 LLM
    const action = assetType === 'character' ? 'ai_design_character' : 'ai_design_location'
    const maxInputTokens = Math.max(1200, Math.ceil(finalPrompt.length * 1.2))
    const maxOutputTokens = 1200
    const runCompletion = async () =>
        await executeAiTextStep({
            userId,
            model: analysisModel,
            messages: [{ role: 'user', content: finalPrompt }],
            temperature: 0.7,
            projectId,
            action,
            meta: {
                stepId: action,
                stepTitle: assetType === 'character' ? 'Character design' : 'Location design',
                stepIndex: 1,
                stepTotal: 1,
            },
        })
    const completion = skipBilling
        ? await runCompletion()
        : await withTextBilling(
            userId,
            analysisModel,
            maxInputTokens,
            maxOutputTokens,
            { projectId, action, metadata: { assetType } },
            runCompletion,
        )

    const aiResponse = completion.text

    if (!aiResponse) {
        return { success: false, error: 'The AI returned an empty result' }
    }

    // 解析 JSON 响应
    let parsedResponse
    try {
        parsedResponse = JSON.parse(aiResponse)
    } catch {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                parsedResponse = JSON.parse(jsonMatch[0])
            } catch {
                _ulogError('[AI Design] AI 响应解析失败:', aiResponse)
                return { success: false, error: 'The AI returned an invalid format' }
            }
        } else {
            _ulogError('[AI Design] AI 响应解析失败:', aiResponse)
            return { success: false, error: 'The AI returned an invalid format' }
        }
    }

    if (!parsedResponse.prompt) {
        return { success: false, error: 'The AI result is missing its prompt' }
    }

    return {
        success: true,
        prompt: parsedResponse.prompt
    }
}
