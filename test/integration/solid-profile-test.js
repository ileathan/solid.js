'use strict'

var solid = require('solid')

var serverUrl = 'https://localhost:8443/'
var profileUrl = serverUrl + 'profile/test-profile-card'
var rawProfileSource = require('test-minimal-profile')
var prefsUrl = serverUrl + 'settings/prefs-test.ttl'
var rawPrefsSource = require('test-minimal-prefs')
var defaultPrivateTypeRegistryUrl = serverUrl + 'settings/privateTypeIndex.ttl'
var defaultPublicTypeRegistryUrl = serverUrl + 'profile/publicTypeIndex.ttl'

function clearResource (url) {
  return solid.web.del(url)
    .catch(function () {
      // do nothing (likely tried to delete a non-existent resource)
    })
}

function ensureProfile (profileUrl) {
  var createProfile = false
  return solid.web.head(profileUrl)
    .catch(function (error) {
      if (error.code === 404) {
        console.log('Profile not found.')
        createProfile = true
      } else {
        console.log('Error on HEAD profile url:', error)
      }
      return createProfile
    })
    .then(function () {
      if (createProfile) {
        console.log('Creating test profile...')
        return solid.web.put(profileUrl, rawProfileSource, 'text/turtle')
      } else {
        console.log('Profile detected, no problem.')
      }
    })
    .catch(function (error) {
      console.log('Error creating test profile:', error)
    })
    .then(function () {
      if (createProfile) {
        console.log('Profile created.')
      }
    })
}

function resetProfile (url) {
  console.log('Resetting profile...')
  return clearResource(url)
    .then(function () {
      return ensureProfile(url)
    })
    .then(function () {
      return clearResource(prefsUrl)
    })
    .then(function () {
      return solid.web.put(prefsUrl, rawPrefsSource, 'text/turtle')
    })
}

QUnit.module('SolidProfile tests')

/**
 * Runs before the test suite
 */
QUnit.begin(function (details) {
})

QUnit.test('getProfile() test', function (assert) {
  assert.expect(3)
  return ensureProfile(profileUrl)
    .then(function () {
      return solid.getProfile(profileUrl)
    })
    .then(function (profile) {
      assert.ok(profile.isLoaded)
      assert.deepEqual(profile.response.types,
        ['http://www.w3.org/ns/ldp#Resource'])
      assert.deepEqual(profile.storage, [serverUrl])
    })
})

QUnit.test('initTypeRegistryPublic() test', function (assert) {
  assert.expect(2)
  var profile
  return clearResource(defaultPublicTypeRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      return resetProfile(profileUrl)
    })
    .then(function () {
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.typeRegistry.initTypeRegistryPublic(profile)
    })
    .then(function () {
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasTypeRegistryPublic())
      assert.equal(profile.typeIndexListed.uri, defaultPublicTypeRegistryUrl)
    })
    .then(function () {
      return clearResource(defaultPublicTypeRegistryUrl)
    })
})

QUnit.test('initTypeRegistryPrivate() test', function (assert) {
  assert.expect(2)
  var profile
  return clearResource(defaultPrivateTypeRegistryUrl)
    .then(function () {
      // Make sure registry does not exist
      return resetProfile(profileUrl)
    })
    .then(function () {
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      return solid.typeRegistry.initTypeRegistryPrivate(profile)
    })
    .then(function () {
      // reload the profile
      return solid.getProfile(profileUrl)
    })
    .then(function (profileResult) {
      profile = profileResult
      assert.ok(profile.hasTypeRegistryPrivate())
      assert.equal(profile.typeIndexUnlisted.uri, defaultPrivateTypeRegistryUrl)
    })
})
