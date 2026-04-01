declare module 'word-extractor' {
	export interface WordDocument {
		getBody(): string
	}

	export default class WordExtractor {
		extract(filePath: string): Promise<WordDocument>
	}
}
