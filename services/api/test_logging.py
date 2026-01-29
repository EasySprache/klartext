"""
Test script for the logging system
===================================

Run this to verify that logging is working correctly:
    python test_logging.py

This will:
1. Create a test log entry
2. Verify the file was created
3. Load and validate the entry
4. Compute aggregate stats
"""

import uuid
import time
from pathlib import Path
from app.core.run_logger import (
    write_log_entry,
    load_all_logs,
    compute_aggregate_stats,
    hash_text,
    create_run_log_from_simplification,
)


def test_basic_logging():
    """Test basic logging functionality."""
    print("=" * 60)
    print("Test 1: Basic Logging")
    print("=" * 60)
    
    # Use a test log file
    test_log = Path("data/logs/test_api_runs.jsonl")
    test_log.parent.mkdir(parents=True, exist_ok=True)
    
    # Clear test log if exists
    if test_log.exists():
        test_log.unlink()
    
    # Create a test entry
    run_id = str(uuid.uuid4())
    print(f"\n✓ Generated run_id: {run_id}")
    
    input_text = "Der Antragsteller muss die erforderlichen Unterlagen einreichen."
    input_hash = hash_text(input_text)
    print(f"✓ Generated input_hash: {input_hash[:16]}...")
    
    entry = write_log_entry(
        run_id=run_id,
        input_hash=input_hash,
        input_length=len(input_text),
        target_lang="de",
        level="easy",
        model_used="llama-3.1-8b-instant",
        output_length=50,
        latency_ms=250,
        chunk_count=1,
        scores={"avg_sentence_len": 12.0, "word_count": 15},
        warnings=[],
        log_file=test_log
    )
    
    print(f"✓ Written log entry to {test_log}")
    
    # Verify file exists
    assert test_log.exists(), "Log file was not created!"
    print(f"✓ Log file exists ({test_log.stat().st_size} bytes)")
    
    # Load and verify
    logs = load_all_logs(test_log)
    assert len(logs) == 1, f"Expected 1 log entry, got {len(logs)}"
    print(f"✓ Loaded {len(logs)} log entry")
    
    # Verify contents
    assert logs[0]["run_id"] == run_id
    assert logs[0]["input_hash"] == input_hash
    assert logs[0]["input_length"] == len(input_text)
    assert logs[0]["target_lang"] == "de"
    assert logs[0]["level"] == "easy"
    print("✓ Log entry contents verified")
    
    print("\n✅ Test 1 PASSED\n")
    return test_log


def test_multiple_entries(test_log):
    """Test writing multiple entries."""
    print("=" * 60)
    print("Test 2: Multiple Entries")
    print("=" * 60)
    
    # Write 5 more entries
    for i in range(5):
        entry = write_log_entry(
            run_id=str(uuid.uuid4()),
            input_hash=hash_text(f"Test input {i}"),
            input_length=100 + i * 10,
            target_lang="de" if i % 2 == 0 else "en",
            level=["very_easy", "easy", "medium"][i % 3],
            model_used="llama-3.1-8b-instant",
            output_length=80 + i * 5,
            latency_ms=200 + i * 50,
            log_file=test_log
        )
        print(f"✓ Written entry {i+1}/5")
        time.sleep(0.1)  # Small delay to ensure different timestamps
    
    # Load and verify
    logs = load_all_logs(test_log)
    assert len(logs) == 6, f"Expected 6 log entries, got {len(logs)}"
    print(f"\n✓ Total entries: {len(logs)}")
    
    print("\n✅ Test 2 PASSED\n")


def test_aggregate_stats(test_log):
    """Test aggregate statistics computation."""
    print("=" * 60)
    print("Test 3: Aggregate Statistics")
    print("=" * 60)
    
    stats = compute_aggregate_stats(test_log)
    
    print(f"\nAggregate Statistics:")
    print(f"  Total runs: {stats['total_runs']}")
    print(f"  Avg latency: {stats['avg_latency_ms']}ms")
    print(f"  Avg input length: {stats['avg_input_length']} chars")
    print(f"  Avg output length: {stats['avg_output_length']} chars")
    print(f"  Languages: {stats['languages']}")
    print(f"  Levels: {stats['levels']}")
    print(f"  Models: {stats['models']}")
    
    assert stats['total_runs'] == 6
    assert stats['avg_latency_ms'] > 0
    assert 'de' in stats['languages']
    assert 'easy' in stats['levels']
    
    print("\n✅ Test 3 PASSED\n")


def test_convenience_function(test_log):
    """Test convenience function for logging from simplification."""
    print("=" * 60)
    print("Test 4: Convenience Function")
    print("=" * 60)
    
    # Simulate a simplification
    input_text = "Dies ist ein komplexer Satz mit vielen Wörtern und schwierigen Konzepten."
    output_text = "Das ist ein einfacher Satz. Er hat wenige Wörter."
    
    # Clear test log
    if test_log.exists():
        test_log.unlink()
    
    # Use convenience function
    from app.core.run_logger import create_run_log_from_simplification
    
    # Override the log file path temporarily
    import os
    original_env = os.environ.get('LOG_FILE_PATH')
    os.environ['LOG_FILE_PATH'] = str(test_log)
    
    try:
        entry = create_run_log_from_simplification(
            run_id=str(uuid.uuid4()),
            input_text=input_text,
            output_text=output_text,
            target_lang="de",
            level="easy",
            model_used="llama-3.1-8b-instant",
            latency_ms=300,
            warnings=["test_warning"],
            scores={"test_score": 42.0}
        )
        
        print(f"✓ Created log entry")
        print(f"  Run ID: {entry['run_id']}")
        print(f"  Input hash: {entry['input_hash'][:16]}...")
        print(f"  Input length: {entry['input_length']}")
        print(f"  Output length: {entry['output_length']}")
        
        # Verify
        logs = load_all_logs(test_log)
        assert len(logs) == 1
        assert logs[0]["warnings"] == ["test_warning"]
        assert logs[0]["scores"]["test_score"] == 42.0
        
        print("\n✅ Test 4 PASSED\n")
        
    finally:
        # Restore original env
        if original_env:
            os.environ['LOG_FILE_PATH'] = original_env
        elif 'LOG_FILE_PATH' in os.environ:
            del os.environ['LOG_FILE_PATH']


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("KlarText Logging System Tests")
    print("=" * 60 + "\n")
    
    try:
        # Run tests
        test_log = test_basic_logging()
        test_multiple_entries(test_log)
        test_aggregate_stats(test_log)
        test_convenience_function(test_log)
        
        # Final summary
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print(f"\nTest log file: {test_log}")
        print("You can inspect it with:")
        print(f"  cat {test_log}")
        print(f"  jq . {test_log}")
        print("\nTo clean up:")
        print(f"  rm {test_log}")
        print()
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ TEST FAILED!")
        print("=" * 60)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
