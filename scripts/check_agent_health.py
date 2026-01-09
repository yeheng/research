#!/usr/bin/env python3
"""
Agent Health Check Script

Monitors parallel research agents and detects stalled/failed agents.

Usage:
    python3 scripts/check_agent_health.py --topic my_topic
    python3 scripts/check_agent_health.py --topic my_topic --timeout 30
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class AgentHealthChecker:
    """Check health status of research agents."""
    
    def __init__(self, topic: str, timeout_minutes: int = 30):
        self.topic = topic
        self.timeout_minutes = timeout_minutes
        self.base_path = Path(f"RESEARCH/{topic}")
        self.status_file = self.base_path / "research_notes" / "agent_status.json"
    
    def check_health(self) -> Dict:
        """Check health of all agents."""
        if not self.status_file.exists():
            return {
                "status": "error",
                "message": f"Status file not found: {self.status_file}"
            }
        
        with open(self.status_file, 'r') as f:
            data = json.load(f)
        
        agents = data.get("agents", [])
        now = datetime.now()
        
        results = {
            "total": len(agents),
            "active": 0,
            "completed": 0,
            "stalled": 0,
            "error": 0,
            "agents": []
        }
        
        for agent in agents:
            agent_status = self._check_agent(agent, now)
            results["agents"].append(agent_status)
            
            if agent_status["health"] == "active":
                results["active"] += 1
            elif agent_status["health"] == "completed":
                results["completed"] += 1
            elif agent_status["health"] == "stalled":
                results["stalled"] += 1
            elif agent_status["health"] == "error":
                results["error"] += 1
        
        results["overall_health"] = self._calculate_overall_health(results)
        
        return results
    
    def _check_agent(self, agent: Dict, now: datetime) -> Dict:
        """Check individual agent health."""
        agent_id = agent.get("id", "unknown")
        status = agent.get("status", "unknown")
        last_update_str = agent.get("last_update", "")
        
        try:
            last_update = datetime.fromisoformat(last_update_str.replace('Z', '+00:00'))
        except:
            return {
                "id": agent_id,
                "health": "error",
                "message": "Invalid timestamp",
                "status": status
            }
        
        time_since_update = (now - last_update).total_seconds() / 60
        
        if status == "completed":
            return {
                "id": agent_id,
                "health": "completed",
                "message": "✓ Completed successfully",
                "status": status,
                "quality_score": agent.get("quality_score", "N/A")
            }
        
        if status == "error":
            return {
                "id": agent_id,
                "health": "error",
                "message": f"✗ Error: {agent.get('progress', 'Unknown error')}",
                "status": status
            }
        
        if time_since_update > self.timeout_minutes:
            return {
                "id": agent_id,
                "health": "stalled",
                "message": f"⚠ Stalled (no update for {int(time_since_update)} min)",
                "status": status,
                "last_update": f"{int(time_since_update)} min ago"
            }
        
        return {
            "id": agent_id,
            "health": "active",
            "message": f"⏳ Active: {agent.get('progress', 'working...')}",
            "status": status,
            "last_update": f"{int(time_since_update)} min ago"
        }
    
    def _calculate_overall_health(self, results: Dict) -> str:
        """Calculate overall health status."""
        total = results["total"]
        if total == 0:
            return "unknown"
        
        completed = results["completed"]
        error = results["error"]
        stalled = results["stalled"]
        
        if completed == total:
            return "healthy"
        
        if error > 0 or stalled > 0:
            if error + stalled >= total / 2:
                return "critical"
            return "degraded"
        
        return "active"
    
    def print_report(self, results: Dict):
        """Print human-readable health report."""
        print(f"\n{'='*60}")
        print(f"Agent Health Report - Topic: {self.topic}")
        print(f"{'='*60}\n")
        
        overall = results["overall_health"]
        status_emoji = {
            "healthy": "✓",
            "active": "⏳",
            "degraded": "⚠",
            "critical": "✗",
            "unknown": "?"
        }
        
        print(f"Overall Status: {status_emoji.get(overall, '?')} {overall.upper()}")
        print(f"Total Agents: {results['total']}")
        print(f"  - Completed: {results['completed']}")
        print(f"  - Active: {results['active']}")
        print(f"  - Stalled: {results['stalled']}")
        print(f"  - Error: {results['error']}")
        print(f"\n{'='*60}\n")
        
        for agent in results["agents"]:
            print(f"{agent['message']}")
            print(f"  ID: {agent['id']}")
            print(f"  Status: {agent['status']}")
            if "quality_score" in agent:
                print(f"  Quality: {agent['quality_score']}/10")
            if "last_update" in agent:
                print(f"  Last Update: {agent['last_update']}")
            print()
        
        print(f"{'='*60}\n")
        
        if overall == "critical":
            print("⚠ CRITICAL: Multiple agents have failed or stalled.")
            print("   Consider restarting failed agents or continuing with available results.\n")
        elif overall == "degraded":
            print("⚠ WARNING: Some agents are experiencing issues.")
            print("   Monitor closely or intervene if necessary.\n")
        elif overall == "healthy":
            print("✓ All agents completed successfully.\n")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Check health of research agents")
    parser.add_argument("--topic", required=True, help="Research topic name")
    parser.add_argument("--timeout", type=int, default=30, 
                       help="Timeout in minutes (default: 30)")
    parser.add_argument("--json", action="store_true", 
                       help="Output JSON instead of human-readable")
    
    args = parser.parse_args()
    
    checker = AgentHealthChecker(args.topic, args.timeout)
    results = checker.check_health()
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        checker.print_report(results)
    
    # Exit code based on health
    if results.get("status") == "error":
        sys.exit(2)
    elif results.get("overall_health") == "critical":
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
