/**
 * @file Tree-sitter grammar for mq language
 * @author harehare
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "mq",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  conflicts: ($) => [[$._expression, $._primary_expr], [$.qualified_access]],

  rules: {
    source_file: ($) => repeat($._expr),

    _expr: ($) =>
      choice(
        $.module_expr,
        $.import_expr,
        $.def_expr,
        $.let_expr,
        $.var_expr,
        $.if_expr,
        $.match_expr,
        $.foreach_expr,
        $.while_expr,
        $.loop_expr,
        $.break_expr,
        $.continue_expr,
        $.include_expr,
        $.block_expr,
        $.macro_expr,
        $._expression
      ),

    // Comments
    comment: (_) => token(seq("#", /.*/)),

    // Module statement
    module_expr: ($) =>
      seq("module", field("name", $.identifier), ":", repeat($._expr), "end"),

    // Import statement
    import_expr: ($) => seq("import", field("path", $.string)),

    // Definition statement
    def_expr: ($) =>
      seq(
        "def",
        field("name", $.identifier),
        optional(field("parameters", $.parameter_list)),
        ":",
        choice(
          // Single expression form: def name(): expr;
          seq(field("body", $._primary_expr), ";"),
          // Block form: def name(): ... end
          seq(repeat($._expr), "end")
        )
      ),

    parameter_list: ($) =>
      seq(
        "(",
        optional(
          seq(
            choice($.parameter, $.variadic_parameter),
            repeat(seq(",", choice($.parameter, $.variadic_parameter)))
          )
        ),
        ")"
      ),

    parameter: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq("=", field("default", $._primary_expr)))
      ),

    variadic_parameter: ($) => seq("*", field("name", $.identifier)),

    // Let statement
    let_expr: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        "=",
        field("value", $._expression)
      ),

    // Var statement
    var_expr: ($) =>
      seq(
        "var",
        field("name", $.identifier),
        "=",
        field("value", $._expression)
      ),

    // Include statement
    include_expr: ($) => seq("include", field("path", $.string)),

    // If statement
    if_expr: ($) =>
      seq(
        "if",
        field("condition", $._expression),
        ":",
        field("body", $._primary_expr),
        repeat($.elif_clause),
        optional($.else_clause)
      ),

    elif_clause: ($) =>
      seq(
        "elif",
        field("condition", $._expression),
        ":",
        field("body", $._primary_expr)
      ),

    else_clause: ($) => seq("else", ":", field("body", $._primary_expr)),

    // Match statement
    match_expr: ($) =>
      seq(
        "match",
        field("value", $._expression),
        ":",
        repeat1($.match_arm),
        "end"
      ),

    match_arm: ($) =>
      seq(
        "|",
        field("pattern", $.pattern),
        optional(field("guard", $.guard)),
        ":",
        field("body", $._primary_expr)
      ),

    guard: ($) => seq("if", $._expression),

    pattern: ($) =>
      choice(
        $.literal_pattern,
        $.type_pattern,
        $.array_pattern,
        $.dict_pattern,
        $.wildcard_pattern,
        $.variable_pattern
      ),

    // Literal patterns: numbers, strings, booleans, none
    literal_pattern: ($) => choice($.number, $.string, $.boolean, $.none),

    // Type patterns: :string, :number, :array, :dict, :bool, :none, :markdown
    type_pattern: (_) =>
      token(
        seq(
          ":",
          choice(
            "string",
            "number",
            "array",
            "dict",
            "bool",
            "none",
            "markdown"
          )
        )
      ),

    // Array patterns: [], [x], [x, y], [first, ...rest]
    array_pattern: ($) =>
      seq(
        "[",
        optional(seq($.pattern_element, repeat(seq(",", $.pattern_element)))),
        "]"
      ),

    pattern_element: ($) => choice($.rest_pattern, $.variable_pattern),

    rest_pattern: ($) => seq("..", field("variable", $.identifier)),

    // Dict patterns: {}, {name, age}
    dict_pattern: ($) =>
      seq(
        "{",
        optional(
          seq(
            field("key", $.identifier),
            repeat(seq(",", field("key", $.identifier)))
          )
        ),
        "}"
      ),

    // Wildcard pattern: _
    wildcard_pattern: (_) => "_",

    // Variable pattern: x
    variable_pattern: ($) => $.identifier,

    // Loop statements
    foreach_expr: ($) =>
      seq(
        "foreach",
        "(",
        field("variable", $.identifier),
        ",",
        field("iterable", $._expression),
        ")",
        ":",
        repeat($._expr),
        choice("end", ";")
      ),

    while_expr: ($) =>
      seq(
        "while",
        field("condition", $._expression),
        ":",
        repeat($._expr),
        "end"
      ),

    loop_expr: ($) => seq("loop", ":", repeat($._expr), "end"),

    block_expr: ($) => seq("do", repeat($._expr), "end"),

    macro_expr: ($) =>
      seq(
        "macro",
        field("name", $.identifier),
        optional(field("parameters", $.parameter_list)),
        ":",
        choice(
          // Single expression form: macro name(): expr;
          seq(field("body", $._primary_expr), ";"),
          // Block form: macro name(): ... end
          seq(repeat($._expr), "end")
        )
      ),

    // Control flow
    break_expr: (_) => "break",
    continue_expr: (_) => "continue",

    // Expressions
    _expression: ($) =>
      choice(
        $.pipe,
        $.assignment_expr,
        $.binary_expr,
        $.unary_expr,
        $.qualified_access,
        $.selector_expr,
        $.call_expr,
        $.array,
        $.dict,
        $.group_expr,
        $.function_expr,
        $.interpolated_string,
        $.identifier,
        $.self,
        $.nodes,
        $._literal
      ),

    // Pipe (lowest precedence to allow multi-line pipes)
    pipe: ($) =>
      prec.left(1, seq($._primary_expr, repeat1(seq("|", $._primary_expr)))),

    _primary_expr: ($) =>
      choice(
        $.assignment_expr,
        $.binary_expr,
        $.unary_expr,
        $.qualified_access,
        $.selector_expr,
        $.call_expr,
        $.array,
        $.dict,
        $.group_expr,
        $.function_expr,
        $.interpolated_string,
        $.identifier,
        $.self,
        $._literal
      ),

    // Binary expressions
    binary_expr: ($) =>
      choice(
        prec.left(10, seq($._primary_expr, "+", $._primary_expr)),
        prec.left(10, seq($._primary_expr, "-", $._primary_expr)),
        prec.left(11, seq($._primary_expr, "*", $._primary_expr)),
        prec.left(11, seq($._primary_expr, "/", $._primary_expr)),
        prec.left(11, seq($._primary_expr, "%", $._primary_expr)),
        prec.left(5, seq($._primary_expr, "==", $._primary_expr)),
        prec.left(5, seq($._primary_expr, "!=", $._primary_expr)),
        prec.left(6, seq($._primary_expr, "<", $._primary_expr)),
        prec.left(6, seq($._primary_expr, "<=", $._primary_expr)),
        prec.left(6, seq($._primary_expr, ">", $._primary_expr)),
        prec.left(6, seq($._primary_expr, ">=", $._primary_expr)),
        prec.left(3, seq($._primary_expr, "&&", $._primary_expr)),
        prec.left(2, seq($._primary_expr, "||", $._primary_expr)),
        prec.left(7, seq($._primary_expr, "..", $._primary_expr))
      ),

    // Assignment expressions
    assignment_expr: ($) =>
      choice(
        prec.right(0, seq($._primary_expr, "=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "|=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "+=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "-=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "*=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "/=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "%=", $._primary_expr)),
        prec.right(0, seq($._primary_expr, "//=", $._primary_expr))
      ),

    // Unary expressions
    unary_expr: ($) =>
      choice(
        prec(12, seq("!", $._primary_expr)),
        prec(12, seq("-", $._primary_expr))
      ),

    // Qualified access expression (module::function or module::function())
    qualified_access: ($) =>
      choice(
        // With arguments: higher precedence to consume argument_list
        prec.dynamic(
          15,
          seq(
            field("module", $.identifier),
            "::",
            field("function", $.identifier),
            field("arguments", $.argument_list)
          )
        ),
        // Without arguments: lower precedence
        prec.dynamic(
          14,
          seq(
            field("module", $.identifier),
            "::",
            field("function", $.identifier)
          )
        )
      ),

    // Call expression
    call_expr: ($) =>
      prec(
        13,
        seq(
          field("function", $.identifier),
          field("arguments", $.argument_list)
        )
      ),

    argument_list: ($) =>
      seq(
        "(",
        optional(seq($._primary_expr, repeat(seq(",", $._primary_expr)))),
        ")"
      ),

    // Selector expression
    selector_expr: ($) =>
      prec.left(
        15,
        choice(
          // Dot-prefixed selectors like .property, .property.property2, .[], .[][]
          seq(
            ".",
            choice(
              field("property", $.identifier),
              seq("[", optional(field("index", $._primary_expr)), "]"),
              seq(
                "[",
                field("start", $._primary_expr),
                ":",
                field("end", $._primary_expr),
                "]"
              )
            ),
            repeat(
              choice(
                seq(".", field("property", $.identifier)),
                seq("[", optional(field("index", $._primary_expr)), "]"),
                seq(
                  "[",
                  field("start", $._primary_expr),
                  ":",
                  field("end", $._primary_expr),
                  "]"
                )
              )
            )
          ),
          // Base expression with selectors
          seq(
            field("base", $._primary_expr),
            repeat1(
              choice(
                seq(".", field("property", $.identifier)),
                seq("[", optional(field("index", $._primary_expr)), "]"),
                seq(
                  "[",
                  field("start", $._primary_expr),
                  ":",
                  field("end", $._primary_expr),
                  "]"
                )
              )
            )
          )
        )
      ),

    // Function expression
    function_expr: ($) =>
      seq(
        "fn",
        optional(field("parameters", $.parameter_list)),
        ":",
        field("body", $._primary_expr),
        ";"
      ),

    // Group expression
    group_expr: ($) => seq("(", $._primary_expr, ")"),

    // Array
    array: ($) =>
      seq(
        "[",
        optional(
          seq($._primary_expr, repeat(seq(",", $._primary_expr)), optional(","))
        ),
        "]"
      ),

    // Dictionary
    dict: ($) =>
      seq(
        "{",
        optional(
          seq($.dict_entry, repeat(seq(",", $.dict_entry)), optional(","))
        ),
        "}"
      ),

    dict_entry: ($) =>
      seq(
        field("key", choice($.identifier, $.string)),
        ":",
        field("value", $._primary_expr)
      ),

    // Interpolated string
    interpolated_string: ($) =>
      seq(
        's"',
        repeat(choice($.string_content, $.interpolation, $.escaped_dollar)),
        '"'
      ),

    string_content: (_) => token.immediate(prec(1, /[^"$\\]+/)),

    escaped_dollar: (_) => token.immediate("$$"),

    interpolation: ($) => seq("${", $._primary_expr, "}"),

    // Special identifiers
    self: (_) => "self",
    nodes: (_) => "nodes",

    // Literals
    _literal: ($) => choice($.number, $.string, $.boolean, $.none, $.symbol),

    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    symbol: (_) => token(seq(":", /[a-zA-Z_][a-zA-Z0-9_]*/)),

    number: (_) => {
      const decimal = /[0-9]+/;
      const float = /[0-9]+\.[0-9]+/;
      return token(choice(float, decimal));
    },

    string: (_) =>
      token(seq('"', repeat(choice(/[^"\\]/, seq("\\", /./))), '"')),

    boolean: (_) => choice("true", "false"),

    none: (_) => "None",
  },
});
