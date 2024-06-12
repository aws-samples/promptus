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

export interface DynamoDbEntity {
    entityId: string
    entityContextId: string
}

export interface Project {
    id: string,
    name: string,
    description: string
}

export interface ProjectDto extends Project {
    publicProject: string
}

export interface PromptEntity extends DynamoDbEntity {
    project: Project
    publicEntity: string
    comments: PromptComment[]
}

export interface PromptComment {
    user: string,
    message: string,
    date: string,
    version: number,
    title?: string
}

export interface PromptCommentEntity extends DynamoDbEntity {
    promptComment: PromptComment
}

export interface Prompt {
    id: string,
    name: string,
    description: string
    comments: PromptComment[]
    publicEntity: string
}

export interface PromptDto extends Prompt {
    publicPrompt: string
}

export interface PromptEntity extends DynamoDbEntity {
    prompt: Prompt
}

export interface PromptDetail {
    date?: string;
    modelUsed?: string
    prompt?: string
    answerRaw?: string
    answerParsed?: string
    inference?: any
    isImage: boolean
}

export interface ModelSkeleton {
    prompt: string
}

export interface PromptDetailEntity extends DynamoDbEntity {
    promptDetail: PromptDetail
    version: number
}

export interface Model {
    modelId: string
    modelName: string
}

export interface PromptDetailDto {
    models: Model[]
    promptDetailEntity: PromptDetailEntity[]
    promptEntity: PromptEntity
}

export class AnthropicInferenceEntity {
    public messages: AnthropicMessageEntity[] = [new AnthropicMessageEntity()]
    public temperature: number = 1
    public top_p: number = 0.999
    public top_k: number = 250
    public max_tokens: number = 2000
    public anthropic_version = "bedrock-2023-05-31"
    public stop_sequences: string[] = ["\n\nHuman:"]
}

export class AnthropicMessageEntity {
    public role: string = "user"
    public content: AnthropicMessageContentEntity[] = [new AnthropicMessageContentEntity()]
}

export class AnthropicMessageContentEntity {
    public text: string = ""
    public type: string = "text"
}

export class MistralInferenceEntity {
    public prompt: string = ""
    public temperature: number = 0.5
    public top_p: number = 0.9
    public top_k: number = 200
    public max_tokens: number = 512
    public stop: string[] = []
}

export class TitanTextGenerationConfig {
    public temperature: number = 0
    public topP: number = 1
    public maxTokenCount: number = 512
    public stopSequences: string[] = []
}

export class TitanImageGenerationConfig {
    public cfgScale: number = 8
    public seed: number = 0
    public quality: string = "standard"
    public width: number = 1024
    public height: number = 1024
    public numberOfImages: number = 1
}

export class StabilityInferenceEntity {
    public cfg_scale: number = 10
    public seed: number = 0
    public steps: number = 50
    public width: number = 1024
    public height: number = 1024
    public text_prompts: {
        text: string
        weight: number
    }[] = [{text: "", weight: 1}]
}

export class TitanImageInferenceEntity {
    public imageGenerationConfig: TitanImageGenerationConfig = new TitanImageGenerationConfig()
    public taskType: string = "TEXT_IMAGE"
    public textToImageParams: {
        text: string
        negativeText?: string
    } = {text: ""}
}

export class TitanInferenceEntity {
    public inputText: string = ""
    public textGenerationConfig: TitanTextGenerationConfig = new TitanTextGenerationConfig()
}

export class MetaInferenceEntity {
    public prompt: string = ""
    public temperature: number = 0.5
    public top_p: number = 1
    public max_gen_len: number = 512
}

export class Ai21InferenceEntity {
    public prompt: string = ""
    public temperature: number = 0.5
    public topP: number = 1
    public maxTokens: number = 512
    public stopSequences: string[] = []
    public countPenalty: Ai21Penalty = new Ai21Penalty()
    public presencePenalty: Ai21Penalty = new Ai21Penalty()
    public frequencyPenalty: Ai21Penalty = new Ai21Penalty()
}

export class Ai21Penalty {
    public scale: number = 0
}

export interface PromptusQEntity extends DynamoDbEntity {
    currentPrompt: string
    promptDescription: string
    model: string
}

export interface PromptusQDto extends PromptDetail {
    extractedText: string
}