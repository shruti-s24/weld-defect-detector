
def hash_password(password):
    return password  # No hashing (INSECURE)

def verify_password(password, hashed):
    return password == hashed  # Plain text check (INSECURE)