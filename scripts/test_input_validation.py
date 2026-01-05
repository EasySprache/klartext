#!/usr/bin/env python3
"""
Test script to verify input validation in evaluate_easy_language.py
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Mock Groq client for testing
class MockGroqClient:
    """Mock Groq client for testing without API calls"""
    pass


def test_is_valid_text():
    """Test the is_valid_text helper function"""
    from scripts.evaluate_easy_language import is_valid_text
    
    # Valid text
    assert is_valid_text("Valid text")
    print("✅ Valid text test passed")
    
    # Empty string
    assert not is_valid_text("")
    print("✅ Empty string validation test passed")
    
    # Whitespace only
    assert not is_valid_text("   ")
    print("✅ Whitespace validation test passed")
    
    # None
    assert not is_valid_text(None)
    print("✅ None validation test passed")
    
    # Non-string types
    assert not is_valid_text(123)
    assert not is_valid_text([])
    assert not is_valid_text({})
    print("✅ Non-string type validation test passed")


def test_simplify_text_validation():
    """Test that simplify_text handles invalid inputs gracefully"""
    from scripts.evaluate_easy_language import simplify_text
    
    client = MockGroqClient()
    
    # Test empty string
    result = simplify_text(client, "", "test-model")
    assert result == "", f"Expected empty string, got: {result}"
    print("✅ Empty string test passed")
    
    # Test None input (defensive validation for runtime type safety)
    result = simplify_text(client, None, "test-model")
    assert result == "", f"Expected empty string for None, got: {result}"
    print("✅ None test passed")
    
    # Test whitespace only
    result = simplify_text(client, "   ", "test-model")
    assert result == "", f"Expected empty string for whitespace, got: {result}"
    print("✅ Whitespace test passed")
    
    # Test non-string (int)
    result = simplify_text(client, 123, "test-model")
    assert result == "", f"Expected empty string for integer, got: {result}"
    print("✅ Non-string (int) test passed")


def test_evaluate_compliance_validation():
    """Test that evaluate_compliance handles invalid inputs gracefully"""
    from scripts.evaluate_easy_language import evaluate_compliance
    
    client = MockGroqClient()
    
    # Test empty simplified text
    result = evaluate_compliance(client, "original text", "")
    assert "error" in result, "Expected error key in result"
    assert result["overall_score"] == 0, "Expected overall_score of 0"
    print("✅ Empty simplified text test passed")
    
    # Test empty original text
    result = evaluate_compliance(client, "", "simplified text")
    assert "error" in result, "Expected error key in result"
    assert result["overall_score"] == 0, "Expected overall_score of 0"
    print("✅ Empty original text test passed")
    
    # Test None values
    result = evaluate_compliance(client, None, "simplified text")
    assert "error" in result, "Expected error key in result"
    assert result["overall_score"] == 0, "Expected overall_score of 0"
    print("✅ None original text test passed")
    
    result = evaluate_compliance(client, "original text", None)
    assert "error" in result, "Expected error key in result"
    assert result["overall_score"] == 0, "Expected overall_score of 0"
    print("✅ None simplified text test passed")


def test_run_evaluation_filtering():
    """Test that run_evaluation filters invalid sentences"""
    # This test verifies the filtering logic using the is_valid_text helper
    from scripts.evaluate_easy_language import is_valid_text
    
    test_sentences = [
        "Valid sentence 1",
        "",  # Invalid: empty
        "Valid sentence 2",
        None,  # Invalid: None
        "   ",  # Invalid: whitespace only
        "Valid sentence 3"
    ]
    
    # Simulate the filtering logic from run_evaluation
    valid_sentences = []
    skipped = 0
    for sentence in test_sentences:
        if is_valid_text(sentence):
            valid_sentences.append(sentence)
        else:
            skipped += 1
    
    assert len(valid_sentences) == 3, f"Expected 3 valid sentences, got {len(valid_sentences)}"
    assert skipped == 3, f"Expected 3 skipped sentences, got {skipped}"
    print("✅ Sentence filtering test passed")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 Testing Input Validation")
    print("=" * 70)
    
    try:
        test_is_valid_text()
        print()
        test_simplify_text_validation()
        print()
        test_evaluate_compliance_validation()
        print()
        test_run_evaluation_filtering()
        print("\n" + "=" * 70)
        print("✅ All tests passed!")
        print("=" * 70)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
