/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IChatModelInformation, ModelSupportedEndpoint } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { BYOKModelCapabilities } from '../common/byokProvider';
import { OpenAIEndpoint } from '../node/openAIEndpoint';
import { AbstractOpenAICompatibleLMProvider, LanguageModelChatConfiguration, OpenAICompatibleLanguageModelChatInformation } from './abstractLanguageModelChatProvider';
import { IBYOKStorageService } from './byokStorageService';
import { CustomOAIModelProviderConfig } from './customOAIProvider';

export interface OpenCodeConfig extends LanguageModelChatConfiguration {
	url?: string;
}

interface OpenCodeModelData {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

export class OpenCodeLMProvider extends AbstractOpenAICompatibleLMProvider {
	public static readonly providerName = 'OpenCode';
	private static readonly DEFAULT_BASE_URL = 'https://opencode.ai/zen/go/v1';
	private static readonly DEFAULT_CONTEXT_WINDOW = 256000;
	private static readonly DEFAULT_MAX_OUTPUT_TOKENS = 16000;

	constructor(
		byokStorageService: IBYOKStorageService,
		@IFetcherService fetcherService: IFetcherService,
		@ILogService logService: ILogService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExperimentationService expService: IExperimentationService
	) {
		super(
			OpenCodeLMProvider.providerName.toLowerCase(),
			OpenCodeLMProvider.providerName,
			undefined,
			byokStorageService,
			fetcherService,
			logService,
			instantiationService,
			configurationService,
			expService
		);
	}

	protected override getModelsBaseUrl(configuration: OpenCodeConfig | undefined): string {
		const url = configuration?.url ?? OpenCodeLMProvider.DEFAULT_BASE_URL;
		return url.replace(/\/$/, '');
	}

	protected override resolveModelCapabilities(modelData: unknown): BYOKModelCapabilities | undefined {
		const openCodeModelData = modelData as OpenCodeModelData;
		return {
			name: openCodeModelData.id,
			toolCalling: true,
			vision: true,
			maxInputTokens: OpenCodeLMProvider.DEFAULT_CONTEXT_WINDOW - OpenCodeLMProvider.DEFAULT_MAX_OUTPUT_TOKENS,
			maxOutputTokens: OpenCodeLMProvider.DEFAULT_MAX_OUTPUT_TOKENS,
			supportsReasoningEffort: ['none', 'medium', 'high']
		};
	}

	protected override getModelInfo(modelId: string, modelUrl: string): IChatModelInformation {
		const modelInfo = super.getModelInfo(modelId, modelUrl);
		// OpenCode only supports Chat Completions, not Responses API
		modelInfo.supported_endpoints = [ModelSupportedEndpoint.ChatCompletions];
		return modelInfo;
	}

	protected override async createOpenAIEndPoint(model: OpenAICompatibleLanguageModelChatInformation<CustomOAIModelProviderConfig>): Promise<OpenAIEndpoint> {
		const modelInfo = this.getModelInfo(model.id, model.url);
		const url = `${model.url}/chat/completions`;
		return this._instantiationService.createInstance(OpenAIEndpoint, modelInfo, model.configuration?.apiKey ?? '', url);
	}
}