declare module 'mjml' {
  interface MjmlParsingOptions {
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: 'strict' | 'soft' | 'skip';
    filePath?: string;
    mjmlConfigPath?: string;
    useMjmlConfigOptions?: boolean;
    keepComments?: boolean;
  }

  interface MjmlError {
    line: number;
    message: string;
    tagName: string;
    formattedMessage: string;
  }

  interface MjmlParsingOuput {
    html: string;
    errors: MjmlError[];
  }

  function mjml(
    mjmlString: string,
    options?: MjmlParsingOptions,
  ): MjmlParsingOuput;

  export default mjml;
}
