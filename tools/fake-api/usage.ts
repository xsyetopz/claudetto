/** The usage object of a Messages response, as far as the fake API reads it. */
export interface Usage {
	readonly input_tokens?: number;
	readonly output_tokens: number;
	readonly cache_read_input_tokens: number;
	readonly cache_creation_input_tokens: number;
	readonly cache_creation?: {
		readonly ephemeral_5m_input_tokens: number;
		readonly ephemeral_1h_input_tokens: number;
	};
}
