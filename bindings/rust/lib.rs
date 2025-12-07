//! Tree-sitter grammar for mq language

use tree_sitter_language::LanguageFn;

unsafe extern "C" {
    fn tree_sitter_mq() -> *const ();
}

/// The tree-sitter language function for mq
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_mq) };

/// The content of the node-types.json file for this grammar
pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");

/// The syntax highlighting queries for this grammar
pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&LANGUAGE.into())
            .expect("Error loading mq parser");
    }

    #[test]
    fn test_parse_let() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = "let x = 1";
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert_eq!(root_node.child_count(), 1);

        let let_stmt = root_node.child(0).unwrap();
        assert_eq!(let_stmt.kind(), "let_expr");
    }

    #[test]
    fn test_parse_function_definition() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = r#"def greet(name):
  let message = "Hello"
  | message
end"#;
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert!(root_node.child_count() > 0);

        let def_stmt = root_node.child(0).unwrap();
        assert_eq!(def_stmt.kind(), "def_expr");
    }

    #[test]
    fn test_parse_pipe() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = "x | add(1)";
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert_eq!(root_node.child_count(), 1);

        let pipe_expr = root_node.child(0).unwrap();
        assert_eq!(pipe_expr.kind(), "pipe");
    }

    #[test]
    fn test_parse_array_literal() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = "[1, 2, 3]";
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert_eq!(root_node.child_count(), 1);

        let array = root_node.child(0).unwrap();
        assert_eq!(array.kind(), "array");
    }

    #[test]
    fn test_parse_dict_literal() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = r#"{name: "test", value: 42}"#;
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert_eq!(root_node.child_count(), 1);

        let dict = root_node.child(0).unwrap();
        assert_eq!(dict.kind(), "dict");
    }

    #[test]
    fn test_parse_with_comment() {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&LANGUAGE.into()).unwrap();

        let source_code = "# This is a comment\nlet x = 1";
        let tree = parser.parse(source_code, None).unwrap();
        let root_node = tree.root_node();

        assert_eq!(root_node.kind(), "source_file");
        assert!(root_node.child_count() == 2);

        let comment = root_node.child(0).unwrap();
        assert_eq!(comment.kind(), "comment");
    }
}
