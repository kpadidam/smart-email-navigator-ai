"""
Behave environment configuration for Smart Email Categorizer
"""

from behave import fixture, use_fixture
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def before_all(context):
    """
    Setup before all tests run
    """
    context.api_base_url = "http://localhost:5001"
    context.test_user = None
    context.auth_token = None
    
def before_scenario(context, scenario):
    """
    Setup before each scenario
    """
    # Reset state
    context.emails = []
    context.categories = []
    context.current_email = None
    
def after_scenario(context, scenario):
    """
    Cleanup after each scenario
    """
    # Clean up test data if needed
    pass

def after_all(context):
    """
    Cleanup after all tests complete
    """
    pass