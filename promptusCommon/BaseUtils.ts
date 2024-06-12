/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 *  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {v4 as uuidv4} from "uuid"
import {
    Ai21InferenceEntity,
    AnthropicInferenceEntity,
    MetaInferenceEntity,
    MistralInferenceEntity,
    PromptDetail, StabilityInferenceEntity, TitanImageInferenceEntity,
    TitanInferenceEntity
} from "./Entities";

export class BaseUtils {

    static getDateDifferenceInMinutes(referenceDate: Date) {
        let difference = new Date().getTime() - referenceDate.getTime();
        return Math.round(difference / 1000 / 60);
    }

    static getUuidV4(): string {
        return uuidv4()
    }

    static inferenceForModel(modelId: string, prompt: string) {
        if (modelId?.startsWith("anthropic")) {
            let anthropicInferenceEntity = new AnthropicInferenceEntity();
            anthropicInferenceEntity.messages[0].content[0].text = prompt
            return anthropicInferenceEntity
        } else if (modelId?.startsWith("meta")) {
            let metaInferenceEntity = new MetaInferenceEntity();
            metaInferenceEntity.prompt = prompt;
            return metaInferenceEntity
        } else if (modelId?.startsWith("ai21")) {
            let ai21InferenceEntity = new Ai21InferenceEntity();
            ai21InferenceEntity.prompt = prompt
            return ai21InferenceEntity
        } else if (modelId?.startsWith("amazon")) {
            if (modelId.includes("image")) {
                let titanImageInferenceEntity = new TitanImageInferenceEntity();
                titanImageInferenceEntity.textToImageParams.text = prompt
                return titanImageInferenceEntity
            } else {
                let titanInferenceEntity = new TitanInferenceEntity();
                titanInferenceEntity.inputText = prompt
                return titanInferenceEntity
            }
        } else if (modelId?.startsWith("mistral")) {
            let mistralInferenceEntity = new MistralInferenceEntity();
            mistralInferenceEntity.prompt = prompt
            return mistralInferenceEntity
        } else if (modelId?.startsWith("stability")) {
            let stabilityInferenceEntity = new StabilityInferenceEntity();
            stabilityInferenceEntity.text_prompts[0].text = prompt
            return stabilityInferenceEntity
        } else {
            return null
        }
    }

    // Doing this because of this: https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-prepare.html#model-customization-prepare-finetuning
    // There might be a better way to do this, but this is what I came up with.
    static calculateTokenFromText(text?: string) {
        if (!text || text.length === 0) {
            return 0
        }
        return Math.round(text.length / 6)
    }

    static promptFromInference(promptDetail?: PromptDetail) {
        if (!promptDetail) return undefined;
        if (promptDetail.modelUsed?.startsWith("anthropic")) {
            return (promptDetail.inference as AnthropicInferenceEntity).messages[0].content[0].text
        } else if (promptDetail.modelUsed?.startsWith("amazon")) {
            if (promptDetail.modelUsed?.includes("image")) {
                return (promptDetail.inference as TitanImageInferenceEntity).textToImageParams.text
            } else {
                return (promptDetail.inference as TitanInferenceEntity).inputText
            }
        } else if (promptDetail.modelUsed?.startsWith("meta")) {
            return (promptDetail.inference as MetaInferenceEntity).prompt
        } else if (promptDetail.modelUsed?.startsWith("ai21")) {
            return (promptDetail.inference as Ai21InferenceEntity).prompt
        } else if (promptDetail.modelUsed?.startsWith("mistral")) {
            return (promptDetail.inference as MistralInferenceEntity).prompt
        } else if (promptDetail.modelUsed?.startsWith("stability")) {
            return (promptDetail.inference as StabilityInferenceEntity).text_prompts[0].text
        } else {
            return undefined;
        }
    }

    static setPromptToInference(promptDetail: PromptDetail, prompt: string) {
        if (promptDetail.modelUsed?.startsWith("anthropic")) {
            (promptDetail.inference as AnthropicInferenceEntity).messages[0].content[0].text = prompt
        } else if (promptDetail.modelUsed?.startsWith("amazon")) {
            if (promptDetail.modelUsed?.includes("image")) {
                (promptDetail.inference as TitanImageInferenceEntity).textToImageParams.text = prompt
            } else {
                (promptDetail.inference as TitanInferenceEntity).inputText = prompt
            }
        } else if (promptDetail.modelUsed?.startsWith("meta")) {
            (promptDetail.inference as MetaInferenceEntity).prompt = prompt
        } else if (promptDetail.modelUsed?.startsWith("ai21")) {
            (promptDetail.inference as Ai21InferenceEntity).prompt = prompt
        } else if (promptDetail.modelUsed?.startsWith("mistral")) {
            (promptDetail.inference as MistralInferenceEntity).prompt = prompt
        } else if (promptDetail.modelUsed?.startsWith("stability")) {
            (promptDetail.inference as StabilityInferenceEntity).text_prompts[0].text = prompt
        }
        return promptDetail
    }

}
