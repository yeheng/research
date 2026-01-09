#!/bin/bash
# Setup script for Deep Research Agent

set -e

echo "=================================="
echo "Deep Research Agent - Setup"
echo "=================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version || { echo "Error: Python 3 not found"; exit 1; }
echo "✓ Python 3 found"
echo ""

# Create virtual environment (optional)
read -p "Create virtual environment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✓ Virtual environment created and activated"
    echo ""
fi

# Install dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Create necessary directories
echo "Creating directory structure..."
mkdir -p RESEARCH
mkdir -p scripts
mkdir -p .claude/skills
mkdir -p .claude/shared/constants
mkdir -p .claude/shared/templates
echo "✓ Directories created"
echo ""

# Set script permissions
echo "Setting script permissions..."
chmod +x scripts/*.py 2>/dev/null || true
echo "✓ Permissions set"
echo ""

# Create settings file if not exists
if [ ! -f .claude/settings.local.json ]; then
    echo "Creating default settings..."
    cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(mkdir)",
      "Bash(mv)",
      "Bash(ls)",
      "Bash(cat)",
      "Bash(head)",
      "Bash(rm)",
      "Bash(cp)",
      "Bash(python3)"
    ]
  },
  "research": {
    "default_output_dir": "RESEARCH",
    "max_agents": 8,
    "default_quality_threshold": 8.0,
    "citation_style": "inline-with-url"
  }
}
EOF
    echo "✓ Settings file created"
else
    echo "✓ Settings file already exists"
fi
echo ""

# Verify installation
echo "Verifying installation..."
python3 -c "import bs4, html2text, markdown" && echo "✓ Core libraries working" || echo "⚠ Some libraries may not be installed"
echo ""

echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Review .claude/settings.local.json for configuration"
echo "2. Start research with: /deep-research [your topic]"
echo "3. See README.md for usage examples"
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Note: Virtual environment is activated."
    echo "      Deactivate with: deactivate"
    echo ""
fi
