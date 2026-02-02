#!/bin/bash
# Setup script for automatic 48-hour metrics reporting
# This installs a launchd service that runs every 48 hours

set -e

# Dynamically determine project root (from scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_TEMPLATE="$SCRIPT_DIR/com.klartext.metrics.plist"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
INSTALLED_PLIST="$LAUNCHD_DIR/com.klartext.metrics.plist"

echo "========================================="
echo "KlarText Metrics Scheduler Setup"
echo "========================================="
echo ""
echo "Project root: $PROJECT_ROOT"
echo ""

# Detect Python path
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    echo "Error: python3 not found in PATH"
    exit 1
fi
PYTHON_DIR=$(dirname "$PYTHON_PATH")
echo "Python: $PYTHON_PATH"
echo "Python dir: $PYTHON_DIR"
echo ""

# Check if plist template exists
if [ ! -f "$PLIST_TEMPLATE" ]; then
    echo "Error: plist template not found at $PLIST_TEMPLATE"
    exit 1
fi

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCHD_DIR"

# Generate plist from template by substituting placeholders
echo "Installing service..."
sed -e "s|{{PROJECT_ROOT}}|$PROJECT_ROOT|g" \
    -e "s|{{PYTHON_PATH}}|$PYTHON_PATH|g" \
    -e "s|{{PYTHON_DIR}}|$PYTHON_DIR|g" \
    "$PLIST_TEMPLATE" > "$INSTALLED_PLIST"
echo "✓ Generated plist at $INSTALLED_PLIST"

# Load the service
echo ""
echo "Loading service..."
launchctl load "$INSTALLED_PLIST"
echo "✓ Service loaded"

# Verify it's running
echo ""
echo "Checking service status..."
if launchctl list | grep -q "com.klartext.metrics"; then
    echo "✓ Service is active"
else
    echo "⚠ Service may not be running. Check logs at:"
    echo "  $PROJECT_ROOT/data/logs/metrics_scheduler.log"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Reports will be generated every 48 hours at:"
echo "  $PROJECT_ROOT/data/logs/metrics_overview.txt"
echo ""
echo "Logs:"
echo "  Output: $PROJECT_ROOT/data/logs/metrics_scheduler.log"
echo "  Errors: $PROJECT_ROOT/data/logs/metrics_scheduler_error.log"
echo ""
echo "Management commands:"
echo "  Stop:    launchctl unload $INSTALLED_PLIST"
echo "  Start:   launchctl load $INSTALLED_PLIST"
echo "  Remove:  launchctl unload $INSTALLED_PLIST && rm $INSTALLED_PLIST"
echo "  Status:  launchctl list | grep klartext"
echo ""
echo "To trigger a report immediately:"
echo "  cd $PROJECT_ROOT"
echo "  python scripts/run_scheduled_metrics.py --run-once"
echo ""
