import { parseYaml } from 'obsidian';
// class Token {
//   constructor(type, lexeme, source) {
//     this.type = type;
//     this.source = source;
//     this.lexeme = lexeme;
//   }
// }

const NOTE = 'note';
const CURRENT = 'current';
const BOAT = 'boat';
const LINK = 'link';
const WORDS = 'words';
const WIKI = 'wiki';

const LITERAL = 'LITERAL';
const EXPRESSION = 'EXPRESSION';

class Parser {
  constructor() {
    if (Parser.instance) {
      // eslint-disable-next-line no-constructor-return
      return Parser.instance;
    }
    Parser.instance = this;

    this.keywords = new Map([
      ['note', NOTE],
      ['current', CURRENT],
      ['boat', BOAT],
      ['link', LINK],
      ['words', WORDS],
      ['wiki', WIKI],
    ]);
  }

  scan(source) {
    const re_expression = /(.*?)({{(.*?)}})/g;
    const matches = [...source.matchAll(re_expression)];

    const tokens = [];
    let current_source_index = 0;

    matches.forEach((match) => {
      const [match_source, preceding_source, expression_source, expression_lexeme] = match;

      if (preceding_source) {
        const token = {
          type: LITERAL,
          lexeme: preceding_source,
          source: preceding_source,
        };
        tokens.push(token);
      }

      if (expression_source) {
        const token = {
          type: EXPRESSION,
          lexeme: expression_lexeme,
          source: expression_source,
        };
        tokens.push(token);
      }

      // const token = preceding_source
      //   ? new Token('LITERAL', preceding_source, preceding_source)
      //   : new Token('EXPRESSION', expression_lexeme, expression_source);

      current_source_index = match.index + match_source.length;
    });

    if (current_source_index < source.length) {
      const remaining_source = source.slice(current_source_index);
      const token = {
        type: LITERAL,
        lexeme: remaining_source,
        source: remaining_source,
      };
      // const token = new Token(LITERAL, remaining_source, remaining_source);
      tokens.push(token);
    }

    return tokens;
  }

  parse_arguments(argument_source) {
    const re_args = /^(\[\[(.*?)\]\]|.*?)$/g;
    const matches = [...argument_source.matchAll(re_args)];

    if (matches[0]) {
      const [, argument_text, argument_link] = matches[0];
      const argument = {
        source: argument_source,
        text: argument_text,
        link: argument_link,
      };

      return argument;
    }

    return null;
  }

  parse_expression(token) {
    const re_expression = /^(.*?)(\s*:\s*(.*?))?$/g;
    const matches = [...token.lexeme.matchAll(re_expression)];

    if (!matches) return null;

    const [, keyword_source, , arguments_source] = matches[0];

    if (this.keywords.has(keyword_source)) {
      const keyword = this.keywords.get(keyword_source);
      const args = arguments_source ? this.parse_arguments(arguments_source) : {};

      const expression = { ...token, keyword, args };
      return expression;
    }

    return null;
  }

  parse_literal(token) {
    return token;
  }

  parse(source) {
    this.source = source;

    const tokens = this.scan(this.source);

    const expressions = [];

    tokens.forEach((token) => {
      let expression;

      if (token.type === EXPRESSION) {
        expression = this.parse_expression(token);
      }

      if (token.type === LITERAL || !expression) {
        expression = this.parse_literal(token);
      }

      expressions.push(expression);
    });

    return expressions;
  }

  parse_file(file, tags) {
    let body = file;
    let metadata = {};

    // Fetch and parse YAML metadata
    const re_yaml = /^---\n((.*?\n)*?)---\n$/gm;
    const match_yaml = [...file.matchAll(re_yaml)];

    if (match_yaml[0] && match_yaml[0].index === 0) {
      metadata = parseYaml(match_yaml[0][1]);
      body = file.slice(match_yaml[0][0].length);
    }

    // Look for metadata in hashtags and YAML tags
    let deck_shuffled = !tags.includes('#deck/ordered');
    deck_shuffled = metadata.shuffle !== undefined ? metadata.shuffle === 'true' : true;
    metadata.shuffle = deck_shuffled;

    // Parse file body
    const source_lines = body.split('\n');

    const re_header = /^([#]{1,6})\s+?(.*)$/;
    const re_list_item = /^[*-]\s+(.*)$/;

    let section_header = '';

    const lines = source_lines
      .map((line) => {
        const match_header = line.match(re_header);
        if (match_header) {
          const header_level = match_header[1].length;
          const header_text = match_header[2];

          if (header_level >= 2) {
            section_header = header_text;
            return null;
          }
        }

        const match_list_item = line.match(re_list_item);
        if (match_list_item) {
          return {
            section: section_header,
            text: match_list_item[1],
          };
        }

        return null;
      })
      .filter((match) => match);

    return { lines, metadata };
  }
}

const parser = new Parser();
export default parser;
