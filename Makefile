# Variables
ZIP ?= zip
DIST_DIR = ./dist

.PHONY: all
all: build

.PHONY: build
build:
	@echo "Building $(DIST_DIR)..."
	mkdir -p ${DIST_DIR}
	${ZIP} -r ${DIST_DIR}/tempomate@dmfs.org.zip . -x .idea/\* dist/\* Makefile .gitignore .git/\* screenshots/\*

.PHONY: clean
clean:
	@echo "Cleaning up..."
	rm -f $(DIST_DIR)/*