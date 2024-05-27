import { getGitFileUrl } from './get-git-file-url'

describe('getGitFileUrl', () => {
  describe('github tests', () => {
    it('simple w/ starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://github.com/owner-name/repo-name'
      )

      const expected =
        'https://github.com/owner-name/repo-name/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/o starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        'directory-name/file-name',
        undefined,
        undefined,
        'https://github.com/owner-name/repo-name'
      )

      const expected =
        'https://github.com/owner-name/repo-name/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and w/o column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        undefined,
        'https://github.com/owner-name/repo-name'
      )

      const expected =
        'https://github.com/owner-name/repo-name/blob/main/directory-name/file-name?plain=1#L10'

      expect(generated).toEqual(expected)
    })

    it('simple w/o line and w/ column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        10,
        'https://github.com/owner-name/repo-name'
      )

      const expected =
        'https://github.com/owner-name/repo-name/blob/main/directory-name/file-name?plain=1:10'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        10,
        'https://github.com/owner-name/repo-name'
      )

      const expected =
        'https://github.com/owner-name/repo-name/blob/main/directory-name/file-name?plain=1#L10:10'

      expect(generated).toEqual(expected)
    })
  })

  describe('gitlab tests', () => {
    it('simple w/ starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://gitlab.com/owner-name/repo-name'
      )

      const expected =
        'https://gitlab.com/owner-name/repo-name/-/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/o starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        'directory-name/file-name',
        undefined,
        undefined,
        'https://gitlab.com/owner-name/repo-name'
      )

      const expected =
        'https://gitlab.com/owner-name/repo-name/-/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and w/o column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        undefined,
        'https://gitlab.com/owner-name/repo-name'
      )

      const expected =
        'https://gitlab.com/owner-name/repo-name/-/blob/main/directory-name/file-name#L10'

      expect(generated).toEqual(expected)
    })

    it('simple w/o line and w/ column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        10,
        'https://gitlab.com/owner-name/repo-name'
      )

      const expected =
        'https://gitlab.com/owner-name/repo-name/-/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        10,
        'https://gitlab.com/owner-name/repo-name'
      )

      const expected =
        'https://gitlab.com/owner-name/repo-name/-/blob/main/directory-name/file-name#L10'

      expect(generated).toEqual(expected)
    })
  })

  describe('bitbucket tests', () => {
    it('simple w/ starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://bitbucket.org/owner-name/repo-name'
      )

      const expected =
        'https://bitbucket.org/owner-name/repo-name/src/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/o starting slash for the filePath', () => {
      const generated = getGitFileUrl(
        'directory-name/file-name',
        undefined,
        undefined,
        'https://bitbucket.org/owner-name/repo-name'
      )

      const expected =
        'https://bitbucket.org/owner-name/repo-name/src/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and w/o column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        undefined,
        'https://bitbucket.org/owner-name/repo-name'
      )

      const expected =
        'https://bitbucket.org/owner-name/repo-name/src/main/directory-name/file-name#lines-10'

      expect(generated).toEqual(expected)
    })

    it('simple w/o line and w/ column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        10,
        'https://bitbucket.org/owner-name/repo-name'
      )

      const expected =
        'https://bitbucket.org/owner-name/repo-name/src/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('simple w/ line and column', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        10,
        10,
        'https://bitbucket.org/owner-name/repo-name'
      )

      const expected =
        'https://bitbucket.org/owner-name/repo-name/src/main/directory-name/file-name#lines-10'

      expect(generated).toEqual(expected)
    })
  })

  describe('Self-hosted', () => {
    it('github', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://self-hosted.git.company.tld/owner-name/repo-name',
        undefined,
        'github'
      )

      const expected =
        'https://self-hosted.git.company.tld/owner-name/repo-name/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('gitlab', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://self-hosted.git.company.tld/owner-name/repo-name',
        undefined,
        'gitlab'
      )

      const expected =
        'https://self-hosted.git.company.tld/owner-name/repo-name/-/blob/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })

    it('bitbucket', () => {
      const generated = getGitFileUrl(
        '/directory-name/file-name',
        undefined,
        undefined,
        'https://self-hosted.git.company.tld/owner-name/repo-name',
        undefined,
        'bitbucket'
      )

      const expected =
        'https://self-hosted.git.company.tld/owner-name/repo-name/src/main/directory-name/file-name'

      expect(generated).toEqual(expected)
    })
  })
})
