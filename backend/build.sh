#!/bin/bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
pip install --upgrade pip
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:$PORT server:app
